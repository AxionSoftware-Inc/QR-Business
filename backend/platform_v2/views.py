from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpResponseRedirect
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AnalyticsEvent, Domain, Membership, QRCode, Site, Tenant
from .permissions import ADMIN_ROLES, WRITE_ROLES, CanAdministerTenant, CanEditTenantObject
from .serializers import (
    DomainSerializer,
    DraftPayloadSerializer,
    EventSerializer,
    MembershipSerializer,
    PublicSiteSerializer,
    QRCodeSerializer,
    SiteSerializer,
    SiteVersionSerializer,
    TenantSerializer,
)
from .services import SitePayloadError, publish_site, record_event, save_draft


def user_tenant_ids(user):
    if not user or not user.is_authenticated:
        return []
    if user.is_staff:
        return Tenant.objects.values_list("id", flat=True)
    return Membership.objects.filter(user=user, is_active=True).values_list("tenant_id", flat=True)


def membership_for(user, tenant_id):
    if user.is_staff:
        return None
    return Membership.objects.filter(user=user, tenant_id=tenant_id, is_active=True).first()


def can_write(user, tenant_id):
    if user.is_staff:
        return True
    membership = membership_for(user, tenant_id)
    return bool(membership and membership.role in WRITE_ROLES)


def can_admin(user, tenant_id):
    if user.is_staff:
        return True
    membership = membership_for(user, tenant_id)
    return bool(membership and membership.role in ADMIN_ROLES)


class TenantViewSet(viewsets.ModelViewSet):
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tenant.objects.filter(id__in=user_tenant_ids(self.request.user)).distinct()

    @transaction.atomic
    def perform_create(self, serializer):
        tenant = serializer.save(status=Tenant.Status.TRIAL, plan=Tenant.Plan.FREE)
        Membership.objects.create(
            tenant=tenant,
            user=self.request.user,
            role=Membership.Role.OWNER,
        )

    def perform_update(self, serializer):
        tenant = self.get_object()
        if not can_admin(self.request.user, tenant.id):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Owner or admin role required.")
        serializer.save(plan=tenant.plan, status=tenant.status)

    def perform_destroy(self, instance):
        if not can_admin(self.request.user, instance.id):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Owner or admin role required.")
        instance.status = Tenant.Status.ARCHIVED
        instance.save(update_fields=["status", "updated_at"])

    @action(detail=True, methods=["get"], url_path="members")
    def members(self, request, pk=None):
        tenant = self.get_object()
        if not can_admin(request.user, tenant.id):
            return Response({"detail": "Owner or admin role required."}, status=403)
        rows = tenant.memberships.select_related("user").order_by("created_at")
        return Response(MembershipSerializer(rows, many=True).data)


class SiteViewSet(viewsets.ModelViewSet):
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated, CanEditTenantObject]

    def get_queryset(self):
        return (
            Site.objects.filter(tenant_id__in=user_tenant_ids(self.request.user))
            .select_related("tenant", "draft_version", "published_version")
            .distinct()
        )

    def perform_create(self, serializer):
        tenant = serializer.validated_data["tenant"]
        if not can_write(self.request.user, tenant.id):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Editor, admin, or owner role required.")
        serializer.save(status=Site.Status.DRAFT)

    def perform_update(self, serializer):
        site = self.get_object()
        if not can_write(self.request.user, site.tenant_id):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Editor, admin, or owner role required.")
        serializer.save(tenant=site.tenant, status=site.status)

    def perform_destroy(self, instance):
        if not can_admin(self.request.user, instance.tenant_id):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Owner or admin role required.")
        instance.status = Site.Status.DISABLED
        instance.save(update_fields=["status", "updated_at"])

    @action(detail=True, methods=["post"], url_path="draft")
    def draft(self, request, pk=None):
        site = self.get_object()
        if not can_write(request.user, site.tenant_id):
            return Response({"detail": "Editor, admin, or owner role required."}, status=403)
        incoming = DraftPayloadSerializer(data=request.data)
        incoming.is_valid(raise_exception=True)
        try:
            version = save_draft(site=site, payload=incoming.validated_data, actor=request.user)
        except SitePayloadError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SiteVersionSerializer(version).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        site = self.get_object()
        if not can_write(request.user, site.tenant_id):
            return Response({"detail": "Editor, admin, or owner role required."}, status=403)
        try:
            version = publish_site(site=site, actor=request.user)
        except SitePayloadError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SiteVersionSerializer(version).data)

    @action(detail=True, methods=["get"], url_path="analytics")
    def analytics(self, request, pk=None):
        site = self.get_object()
        events = site.analytics_events.all()
        totals = events.values("event_type").annotate(count=Count("id"))
        targets = (
            events.filter(event_type=AnalyticsEvent.EventType.CTA_CLICK)
            .exclude(target="")
            .values("target")
            .annotate(count=Count("id"))
            .order_by("-count")[:20]
        )
        return Response({"totals": list(totals), "top_targets": list(targets)})


class DomainViewSet(viewsets.ModelViewSet):
    serializer_class = DomainSerializer
    permission_classes = [IsAuthenticated, CanAdministerTenant]

    def get_queryset(self):
        return Domain.objects.filter(tenant_id__in=user_tenant_ids(self.request.user)).select_related("tenant", "site")

    def perform_create(self, serializer):
        tenant = serializer.validated_data["tenant"]
        if not can_admin(self.request.user, tenant.id):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Owner or admin role required.")
        site = serializer.validated_data.get("site")
        if site and site.tenant_id != tenant.id:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"site": "Site must belong to the selected tenant."})
        serializer.save(kind=Domain.Kind.CUSTOM, status=Domain.Status.PENDING)


class QRCodeViewSet(viewsets.ModelViewSet):
    serializer_class = QRCodeSerializer
    permission_classes = [IsAuthenticated, CanEditTenantObject]

    def get_queryset(self):
        return QRCode.objects.filter(tenant_id__in=user_tenant_ids(self.request.user)).select_related("tenant", "site")

    def perform_create(self, serializer):
        tenant = serializer.validated_data["tenant"]
        site = serializer.validated_data["site"]
        if not can_write(self.request.user, tenant.id):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Editor, admin, or owner role required.")
        if site.tenant_id != tenant.id:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"site": "Site must belong to the selected tenant."})
        serializer.save()


class PublicSiteBySlugView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "public_read"

    def get(self, request, tenant_slug, site_slug):
        site = (
            Site.objects.select_related("tenant", "published_version")
            .filter(
                tenant__slug=tenant_slug,
                tenant__status__in=[Tenant.Status.TRIAL, Tenant.Status.ACTIVE],
                slug=site_slug,
                status=Site.Status.PUBLISHED,
                published_version__isnull=False,
            )
            .first()
        )
        if not site:
            return Response({"detail": "Site not found."}, status=404)
        record_event(request=request, site=site, event_type=AnalyticsEvent.EventType.VIEW)
        response = Response(PublicSiteSerializer(site).data)
        response["Cache-Control"] = "public, max-age=30, stale-while-revalidate=300"
        return response


class PublicEventView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "analytics_write"

    def post(self, request, site_id):
        site = (
            Site.objects.select_related("tenant")
            .filter(
                id=site_id,
                tenant__status__in=[Tenant.Status.TRIAL, Tenant.Status.ACTIVE],
                status=Site.Status.PUBLISHED,
            )
            .first()
        )
        if not site:
            return Response({"detail": "Site not found."}, status=404)
        incoming = EventSerializer(data=request.data)
        incoming.is_valid(raise_exception=True)
        record_event(
            request=request,
            site=site,
            event_type=incoming.validated_data["event_type"],
            target=incoming.validated_data.get("target", ""),
            metadata=incoming.validated_data.get("metadata", {}),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class QRRedirectView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "qr_redirect"

    def get(self, request, code):
        qr = (
            QRCode.objects.select_related("site", "site__tenant")
            .filter(
                code=code,
                is_active=True,
                site__status=Site.Status.PUBLISHED,
                site__tenant__status__in=[Tenant.Status.TRIAL, Tenant.Status.ACTIVE],
            )
            .first()
        )
        if not qr:
            return Response({"detail": "QR code not found."}, status=404)
        record_event(
            request=request,
            site=qr.site,
            qr_code=qr,
            event_type=AnalyticsEvent.EventType.QR_SCAN,
            metadata={"campaign": qr.campaign},
        )
        base = getattr(settings, "PUBLIC_WEB_BASE_URL", "http://localhost:3000").rstrip("/")
        return HttpResponseRedirect(f"{base}/{qr.site.tenant.slug}/{qr.site.slug}")


class HealthView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "public_read"

    def get(self, request):
        return Response({"status": "ok", "api": "v2"})
