from io import BytesIO

from django.core.files.storage import default_storage
from django.http import HttpResponse
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from django.utils.text import slugify
from django.db.models import Q
import socket
import qrcode
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Domain, Site, SiteEvent, Tenant
from .serializers import DomainSerializer, SiteSerializer, TenantSerializer


PLAN_ALLOWED_BLOCKS = {
    Tenant.Plan.ODDIY: {
        "hero",
        "contact_buttons",
        "services",
        "working_hours",
        "location",
    },
    Tenant.Plan.PLUS: {
        "hero",
        "contact_buttons",
        "highlights",
        "services",
        "promo",
        "gallery",
        "testimonials",
        "working_hours",
        "location",
    },
    Tenant.Plan.PRO: {
        "hero",
        "contact_buttons",
        "highlights",
        "services",
        "process",
        "promo",
        "gallery",
        "testimonials",
        "faq",
        "location",
    },
}


def enforce_plan_payload(plan, template_key, theme, blocks):
    allowed_blocks = PLAN_ALLOWED_BLOCKS.get(plan, PLAN_ALLOWED_BLOCKS[Tenant.Plan.ODDIY])
    clean_blocks = []

    for block in blocks if isinstance(blocks, list) else []:
        if not isinstance(block, dict) or block.get("type") not in allowed_blocks:
            continue

        clean_block = {**block}
        if plan == Tenant.Plan.ODDIY and clean_block.get("type") == "hero":
            data = clean_block.get("data") if isinstance(clean_block.get("data"), dict) else {}
            clean_block["data"] = {**data, "coverUrl": None}

        clean_blocks.append(clean_block)

    clean_template = template_key if template_key in Site.TemplateKey.values else Site.TemplateKey.ODDIY
    if plan == Tenant.Plan.ODDIY:
        clean_template = Site.TemplateKey.ODDIY
    elif plan == Tenant.Plan.PLUS and clean_template == Site.TemplateKey.PRO:
        clean_template = Site.TemplateKey.PLUS

    clean_theme = theme if isinstance(theme, dict) else {}
    return clean_template, clean_theme, clean_blocks


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.prefetch_related("domains").all()
    serializer_class = TenantSerializer
    lookup_field = "slug"


class DomainViewSet(viewsets.ModelViewSet):
    queryset = Domain.objects.select_related("tenant").all()
    serializer_class = DomainSerializer


class SiteViewSet(viewsets.ModelViewSet):
    queryset = Site.objects.select_related("tenant").all()
    serializer_class = SiteSerializer

    action_throttle_scopes = {
        "analytics": "anon",
        "add_domain": "guest_update",
        "guest_create": "guest_create",
        "guest_update": "guest_update",
        "slug_available": "slug_check",
        "track": "anon",
        "upload_media": "upload_media",
        "verify_domain": "guest_update",
    }

    def get_throttles(self):
        self.throttle_scope = self.action_throttle_scopes.get(self.action)
        return super().get_throttles()

    def perform_destroy(self, instance):
        tenant = instance.tenant
        instance.delete()
        tenant.delete()

    def perform_update(self, serializer):
        instance = self.get_object()
        theme = self.request.data.get("theme", instance.theme)
        blocks = self.request.data.get("blocks", instance.blocks)
        template_key = (
            self.request.data.get("template_key")
            or self.request.data.get("templateKey")
            or instance.template_key
        )
        clean_template, clean_theme, clean_blocks = enforce_plan_payload(
            instance.tenant.plan,
            template_key,
            theme,
            blocks,
        )
        serializer.save(
            template_key=clean_template,
            theme=clean_theme,
            blocks=clean_blocks,
        )

    @action(detail=False, methods=["get"], url_path=r"by-slug/(?P<slug>[-a-zA-Z0-9_]+)")
    def by_slug(self, request, slug: str):
        site = self.get_queryset().filter(tenant__slug=slug).first()

        if not site:
            return Response({"detail": "Site not found."}, status=404)

        return Response(self.get_serializer(site).data)

    @action(detail=False, methods=["get"], url_path=r"by-domain/(?P<hostname>[^/]+)")
    def by_domain(self, request, hostname: str):
        normalized = normalize_hostname(hostname)
        domain = Domain.objects.select_related("tenant").filter(
            hostname=normalized,
            status=Domain.Status.VERIFIED,
        ).first()

        if not domain:
            return Response({"detail": "Domain not found."}, status=404)

        site = self.get_queryset().filter(tenant=domain.tenant).first()
        if not site:
            return Response({"detail": "Site not found."}, status=404)

        return Response(self.get_serializer(site).data)

    @action(detail=False, methods=["get"], url_path="my-sites")
    def my_sites(self, request):
        owner_token = str(request.query_params.get("ownerToken") or "").strip()
        owner_contact = str(request.query_params.get("ownerContact") or "").strip().lower()
        recovery_code = str(request.query_params.get("recoveryCode") or "").strip().upper()

        if not owner_token and not (owner_contact and recovery_code):
            return Response(
                {"detail": "ownerToken or ownerContact with recoveryCode is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        query = Q()
        if owner_token:
            query |= Q(tenant__owner_token=owner_token)
        if owner_contact and recovery_code:
            query |= Q(
                tenant__owner_contact__iexact=owner_contact,
                tenant__owner_recovery_code__iexact=recovery_code,
            )

        sites = self.get_queryset().filter(query)
        return Response(self.get_serializer(sites, many=True).data)

    @action(detail=False, methods=["get"], url_path="admin-analytics")
    def admin_analytics(self, request):
        sites = self.get_queryset().select_related("tenant").prefetch_related("events", "tenant__domains")
        total_views = SiteEvent.objects.filter(event_type=SiteEvent.EventType.VIEW).count()
        total_clicks = SiteEvent.objects.filter(event_type=SiteEvent.EventType.CLICK).count()
        plan_counts = (
            Tenant.objects.values("plan")
            .annotate(count=Count("id"))
            .order_by("plan")
        )
        status_counts = (
            Site.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        top_click_targets = (
            SiteEvent.objects.filter(event_type=SiteEvent.EventType.CLICK)
            .values("target")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        top_sites = (
            Site.objects.select_related("tenant")
            .annotate(
                views=Count("events", filter=Q(events__event_type=SiteEvent.EventType.VIEW)),
                clicks=Count("events", filter=Q(events__event_type=SiteEvent.EventType.CLICK)),
            )
            .order_by("-views", "-clicks", "title")[:20]
        )

        return Response(
            {
                "totals": {
                    "sites": sites.count(),
                    "published": sites.filter(status=Site.Status.PUBLISHED).count(),
                    "views": total_views,
                    "clicks": total_clicks,
                    "customDomains": Domain.objects.filter(type=Domain.Type.CUSTOM).count(),
                    "verifiedCustomDomains": Domain.objects.filter(
                        type=Domain.Type.CUSTOM,
                        status=Domain.Status.VERIFIED,
                    ).count(),
                },
                "plans": list(plan_counts),
                "statuses": list(status_counts),
                "topClickTargets": list(top_click_targets),
                "topSites": [
                    {
                        "clicks": site.clicks,
                        "id": site.id,
                        "plan": site.tenant.plan,
                        "slug": site.tenant.slug,
                        "status": site.status,
                        "title": site.title,
                        "views": site.views,
                    }
                    for site in top_sites
                ],
            }
        )

    @action(detail=False, methods=["get"], url_path=r"slug-available/(?P<slug>[-a-zA-Z0-9_]+)")
    def slug_available(self, request, slug: str):
        return Response({"slug": slug, "available": not Tenant.objects.filter(slug=slug).exists()})

    @action(detail=False, methods=["post"], url_path="upload-media")
    def upload_media(self, request):
        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response({"detail": "file is required"}, status=status.HTTP_400_BAD_REQUEST)

        path = default_storage.save(f"site-media/{uploaded_file.name}", uploaded_file)
        url = default_storage.url(path)

        return Response({"url": url}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="guest-create")
    def guest_create(self, request):
        business_name = str(request.data.get("businessName") or request.data.get("title") or "").strip()
        requested_slug = str(request.data.get("slug") or business_name or "guest").strip()
        plan = str(request.data.get("plan") or request.data.get("templateKey") or "oddiy").strip()
        owner_token = str(request.data.get("ownerToken") or "").strip()
        owner_contact = str(request.data.get("ownerContact") or "").strip().lower()
        site_payload = request.data.get("site") or {}

        if plan not in Tenant.Plan.values:
            plan = Tenant.Plan.ODDIY

        if not business_name:
            business_name = "Guest biznes"

        base_slug = slugify(requested_slug, allow_unicode=False)[:64] or "guest"
        slug = base_slug
        suffix = 2

        while Tenant.objects.filter(slug=slug).exists():
            slug = f"{base_slug[:58]}-{suffix}"
            suffix += 1

        template_key = site_payload.get("templateKey") or site_payload.get("template_key") or plan
        template_key, clean_theme, clean_blocks = enforce_plan_payload(
            plan,
            template_key,
            site_payload.get("theme") or {},
            site_payload.get("blocks") or [],
        )

        with transaction.atomic():
            tenant = Tenant.objects.create(
                name=business_name,
                slug=slug,
                owner_token=owner_token,
                owner_contact=owner_contact,
                status=Tenant.Status.ACTIVE,
                plan=plan,
            )
            Domain.objects.create(
                tenant=tenant,
                hostname=f"qr.dirac.space/{slug}",
                type=Domain.Type.SUBDOMAIN,
                status=Domain.Status.VERIFIED,
                verified_at=timezone.now(),
            )
            site = Site.objects.create(
                tenant=tenant,
                title=site_payload.get("title") or business_name,
                description=site_payload.get("description") or "",
                template_key=template_key,
                status=Site.Status.PUBLISHED,
                theme=clean_theme,
                blocks=clean_blocks,
                published_at=timezone.now(),
            )

        return Response(self.get_serializer(site).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="add-domain")
    def add_domain(self, request, pk=None):
        site = self.get_object()
        if not owns_site(request, site):
            return Response({"detail": "Owner token or recovery code is invalid."}, status=status.HTTP_403_FORBIDDEN)

        hostname = normalize_hostname(request.data.get("hostname"))

        if not hostname:
            return Response({"detail": "Valid hostname is required."}, status=status.HTTP_400_BAD_REQUEST)

        domain, _created = Domain.objects.update_or_create(
            hostname=hostname,
            defaults={
                "tenant": site.tenant,
                "type": Domain.Type.CUSTOM,
                "status": Domain.Status.PENDING,
            },
        )

        return Response(
            {
                "id": domain.id,
                "hostname": domain.hostname,
                "status": domain.status,
                "type": domain.type,
                "dns_target": "qr.dirac.space",
                "instructions": f"CNAME {domain.hostname} -> qr.dirac.space",
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="verify-domain")
    def verify_domain(self, request, pk=None):
        site = self.get_object()
        if not owns_site(request, site):
            return Response({"detail": "Owner token or recovery code is invalid."}, status=status.HTTP_403_FORBIDDEN)

        hostname = normalize_hostname(request.data.get("hostname"))
        domain = Domain.objects.filter(tenant=site.tenant, hostname=hostname).first()

        if not domain:
            return Response({"detail": "Domain not found."}, status=status.HTTP_404_NOT_FOUND)

        resolved = resolve_domain(hostname)
        expected = resolve_domain("qr.dirac.space")

        if resolved and expected and resolved.intersection(expected):
            domain.status = Domain.Status.VERIFIED
            domain.verified_at = timezone.now()
            domain.save(update_fields=["status", "verified_at", "updated_at"])

        return Response(
            {
                "hostname": domain.hostname,
                "status": domain.status,
                "resolved": sorted(resolved),
                "expected": sorted(expected),
            }
        )

    @action(detail=True, methods=["post"], url_path="guest-update")
    def guest_update(self, request, pk=None):
        site = self.get_object()
        if not owns_site(request, site):
            return Response({"detail": "Owner token or recovery code is invalid."}, status=status.HTTP_403_FORBIDDEN)

        site_payload = request.data.get("site") or {}
        template_key, clean_theme, clean_blocks = enforce_plan_payload(
            site.tenant.plan,
            site_payload.get("templateKey") or site_payload.get("template_key") or site.template_key,
            site_payload.get("theme") or site.theme,
            site_payload.get("blocks") or site.blocks,
        )

        title = str(site_payload.get("title") or site.title).strip() or site.title
        site.title = title
        site.description = site_payload.get("description") or ""
        site.template_key = template_key
        site.theme = clean_theme
        site.blocks = clean_blocks
        site.status = Site.Status.PUBLISHED
        site.published_at = timezone.now()

        owner_contact = owner_contact or str(request.data.get("ownerContact") or "").strip().lower()
        if owner_contact:
            site.tenant.owner_contact = owner_contact
            site.tenant.save(update_fields=["owner_contact", "updated_at"])

        site.save()
        return Response(self.get_serializer(site).data)

    @action(detail=True, methods=["get"], url_path="analytics")
    def analytics(self, request, pk=None):
        site = self.get_object()
        if not owns_site(request, site, source="query"):
            return Response({"detail": "Owner token or recovery code is invalid."}, status=status.HTTP_403_FORBIDDEN)

        views = site.events.filter(event_type=SiteEvent.EventType.VIEW).count()
        clicks = site.events.filter(event_type=SiteEvent.EventType.CLICK).count()
        click_targets = (
            site.events.filter(event_type=SiteEvent.EventType.CLICK)
            .values("target")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return Response(
            {
                "views": views,
                "clicks": clicks,
                "clickTargets": list(click_targets),
            }
        )

    @action(detail=True, methods=["post"], url_path="track")
    def track(self, request, pk=None):
        site = self.get_object()
        event_type = str(request.data.get("eventType") or "view").strip()

        if event_type not in SiteEvent.EventType.values:
            event_type = SiteEvent.EventType.VIEW

        SiteEvent.objects.create(
            site=site,
            event_type=event_type,
            target=str(request.data.get("target") or "").strip()[:80],
            user_agent=str(request.headers.get("user-agent") or "")[:1000],
            ip_address=get_client_ip(request),
        )

        return Response({"ok": True}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="qr")
    def qr(self, request, pk=None):
        site = self.get_object()
        base_url = str(request.query_params.get("baseUrl") or "").strip().rstrip("/")
        public_url = f"{base_url}/{site.tenant.slug}" if base_url else f"/{site.tenant.slug}"
        image_format = str(request.query_params.get("format") or "png").strip().lower()

        if image_format == "svg":
            from qrcode.image.svg import SvgPathImage

            image = qrcode.make(public_url, image_factory=SvgPathImage)
            buffer = BytesIO()
            image.save(buffer)
            buffer.seek(0)
            response = HttpResponse(buffer.getvalue(), content_type="image/svg+xml")
            response["Cache-Control"] = "public, max-age=3600"
            response["Content-Disposition"] = f'attachment; filename="{site.tenant.slug}.svg"'
            return response

        image = qrcode.make(public_url)
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type="image/png")
        response["Cache-Control"] = "public, max-age=3600"
        response["Content-Disposition"] = f'attachment; filename="{site.tenant.slug}.png"'
        return response

    @action(detail=True, methods=["post"], url_path="duplicate")
    def duplicate(self, request, pk=None):
        source = self.get_object()
        base_slug = slugify(f"{source.tenant.slug}-copy", allow_unicode=False)[:64] or "site-copy"
        slug = base_slug
        suffix = 2

        while Tenant.objects.filter(slug=slug).exists():
            slug = f"{base_slug[:58]}-{suffix}"
            suffix += 1

        with transaction.atomic():
            tenant = Tenant.objects.create(
                name=f"{source.tenant.name} copy",
                slug=slug,
                status=Tenant.Status.ACTIVE,
                plan=source.tenant.plan,
            )
            Domain.objects.create(
                tenant=tenant,
                hostname=f"qr.dirac.space/{slug}",
                type=Domain.Type.SUBDOMAIN,
                status=Domain.Status.VERIFIED,
                verified_at=timezone.now(),
            )
            site = Site.objects.create(
                tenant=tenant,
                title=f"{source.title} copy",
                description=source.description,
                template_key=source.template_key,
                status=Site.Status.DRAFT,
                theme=source.theme,
                blocks=source.blocks,
            )

        return Response(self.get_serializer(site).data, status=status.HTTP_201_CREATED)


class HealthView(APIView):
    throttle_scope = "anon"

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "database": "ok",
                "sites": Site.objects.count(),
                "time": timezone.now().isoformat(),
            }
        )


def get_owner_credentials(request, source="data"):
    payload = request.query_params if source == "query" else request.data
    return (
        str(payload.get("ownerToken") or "").strip(),
        str(payload.get("ownerContact") or "").strip().lower(),
        str(payload.get("recoveryCode") or "").strip().upper(),
    )


def owns_site(request, site, source="data"):
    owner_token, owner_contact, recovery_code = get_owner_credentials(request, source)
    owns_by_token = owner_token and owner_token == site.tenant.owner_token
    owns_by_contact = (
        owner_contact
        and recovery_code
        and owner_contact == site.tenant.owner_contact.lower()
        and recovery_code == site.tenant.owner_recovery_code.upper()
    )
    return bool(owns_by_token or owns_by_contact)


def normalize_hostname(value):
    hostname = str(value or "").strip().lower().replace("https://", "").replace("http://", "")
    hostname = hostname.split("/")[0].strip(".")

    if not hostname or "." not in hostname or hostname.endswith("qr.dirac.space"):
        return ""

    return hostname[:255]


def resolve_domain(hostname):
    try:
        return {item[4][0] for item in socket.getaddrinfo(hostname, None)}
    except socket.gaierror:
        return set()


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
