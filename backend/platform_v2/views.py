from io import BytesIO

import dns.exception
import dns.resolver
import qrcode
from django.conf import settings
from django.db import transaction
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.http import HttpResponse, HttpResponseRedirect
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .entitlements import entitlement_payload, enforce_custom_domain, enforce_site_create, for_tenant
from .models import AnalyticsEvent, AuditLog, Domain, Membership, QRCode, Site, Tenant
from .permissions import ADMIN_ROLES, WRITE_ROLES, CanAdministerTenant, CanEditTenantObject
from .serializers import DomainSerializer, DraftPayloadSerializer, EventSerializer, MembershipSerializer, PublicSiteSerializer, QRCodeSerializer, SiteSerializer, SiteVersionSerializer, TenantSerializer
from .services import SitePayloadError, publish_site, record_event, save_draft

ACTIVE_TENANT_STATUSES=(Tenant.Status.TRIAL,Tenant.Status.ACTIVE)


def user_tenant_ids(user):
    if not user or not user.is_authenticated:return []
    if user.is_staff:return Tenant.objects.values_list("id",flat=True)
    return Membership.objects.filter(user=user,is_active=True,tenant__status__in=ACTIVE_TENANT_STATUSES).values_list("tenant_id",flat=True)


def membership_for(user,tenant_id):
    if user.is_staff:return None
    return Membership.objects.filter(user=user,tenant_id=tenant_id,is_active=True,tenant__status__in=ACTIVE_TENANT_STATUSES).first()


def can_write(user,tenant_id):
    if user.is_staff:return True
    membership=membership_for(user,tenant_id)
    return bool(membership and membership.role in WRITE_ROLES)


def can_admin(user,tenant_id):
    if user.is_staff:return True
    membership=membership_for(user,tenant_id)
    return bool(membership and membership.role in ADMIN_ROLES)


def filter_tenant_param(queryset,request):
    tenant_id=str(request.query_params.get("tenant") or "").strip()
    return queryset.filter(tenant_id=tenant_id) if tenant_id else queryset


class TenantViewSet(viewsets.ModelViewSet):
    serializer_class=TenantSerializer;permission_classes=[IsAuthenticated]
    def get_queryset(self):return Tenant.objects.filter(id__in=user_tenant_ids(self.request.user)).distinct().order_by("name","id")
    @transaction.atomic
    def perform_create(self,serializer):
        tenant=serializer.save(status=Tenant.Status.TRIAL,plan=Tenant.Plan.FREE);Membership.objects.create(tenant=tenant,user=self.request.user,role=Membership.Role.OWNER)
    def perform_update(self,serializer):
        tenant=self.get_object()
        if not can_admin(self.request.user,tenant.id):
            from rest_framework.exceptions import PermissionDenied;raise PermissionDenied("Owner or admin role required.")
        serializer.save(plan=tenant.plan,status=tenant.status)
    def perform_destroy(self,instance):
        if not can_admin(self.request.user,instance.id):
            from rest_framework.exceptions import PermissionDenied;raise PermissionDenied("Owner or admin role required.")
        instance.status=Tenant.Status.ARCHIVED;instance.save(update_fields=["status","updated_at"])
    @action(detail=True,methods=["get"],url_path="members")
    def members(self,request,pk=None):
        tenant=self.get_object()
        if not can_admin(request.user,tenant.id):return Response({"detail":"Owner or admin role required."},status=403)
        rows=tenant.memberships.select_related("user").order_by("created_at")
        return Response(MembershipSerializer(rows,many=True).data)
    @action(detail=True,methods=["get"],url_path="entitlements")
    def entitlements(self,request,pk=None):return Response(entitlement_payload(self.get_object()))
    @action(detail=True,methods=["get"],url_path="analytics")
    def analytics(self,request,pk=None):
        tenant=self.get_object();events=AnalyticsEvent.objects.filter(tenant=tenant)
        totals=list(events.values("event_type").annotate(count=Count("id")).order_by("event_type"))
        per_site={}
        for row in events.values("site_id","event_type").annotate(count=Count("id")).order_by("site_id","event_type"):
            bucket=per_site.setdefault(str(row["site_id"]),{"totals":[],"top_targets":[]});bucket["totals"].append({"event_type":row["event_type"],"count":row["count"]})
        target_counts={}
        for row in events.filter(event_type=AnalyticsEvent.EventType.CTA_CLICK).exclude(target="").values("site_id","target").annotate(count=Count("id")).order_by("site_id","-count"):
            site_id=str(row["site_id"]);seen=target_counts.get(site_id,0)
            if seen>=20:continue
            per_site.setdefault(site_id,{"totals":[],"top_targets":[]})["top_targets"].append({"target":row["target"],"count":row["count"]});target_counts[site_id]=seen+1
        response={"totals":totals,"sites":per_site}
        if for_tenant(tenant).advanced_analytics:
            response["daily"]=list(events.annotate(day=TruncDate("occurred_at")).values("day","event_type").annotate(count=Count("id")).order_by("day","event_type")[-360:])
        return Response(response)


class SiteViewSet(viewsets.ModelViewSet):
    serializer_class=SiteSerializer;permission_classes=[IsAuthenticated,CanEditTenantObject]
    def get_queryset(self):
        queryset=Site.objects.filter(tenant_id__in=user_tenant_ids(self.request.user)).select_related("tenant","draft_version","published_version").distinct().order_by("created_at","id")
        return filter_tenant_param(queryset,self.request)
    def perform_create(self,serializer):
        tenant=serializer.validated_data["tenant"]
        if not can_write(self.request.user,tenant.id):
            from rest_framework.exceptions import PermissionDenied;raise PermissionDenied("Editor, admin, or owner role required.")
        enforce_site_create(tenant);serializer.save(status=Site.Status.DRAFT)
    def perform_update(self,serializer):
        site=self.get_object()
        if not can_write(self.request.user,site.tenant_id):
            from rest_framework.exceptions import PermissionDenied;raise PermissionDenied("Editor, admin, or owner role required.")
        serializer.save(tenant=site.tenant,status=site.status)
    def perform_destroy(self,instance):
        if not can_admin(self.request.user,instance.tenant_id):
            from rest_framework.exceptions import PermissionDenied;raise PermissionDenied("Owner or admin role required.")
        instance.status=Site.Status.DISABLED;instance.save(update_fields=["status","updated_at"])
    @action(detail=True,methods=["post"],url_path="draft")
    def draft(self,request,pk=None):
        site=self.get_object()
        if not can_write(request.user,site.tenant_id):return Response({"detail":"Editor, admin, or owner role required."},status=403)
        incoming=DraftPayloadSerializer(data=request.data);incoming.is_valid(raise_exception=True)
        try:version=save_draft(site=site,payload=incoming.validated_data,actor=request.user)
        except SitePayloadError as exc:return Response({"detail":str(exc)},status=status.HTTP_400_BAD_REQUEST)
        return Response(SiteVersionSerializer(version).data,status=status.HTTP_201_CREATED)
    @action(detail=True,methods=["post"],url_path="publish")
    def publish(self,request,pk=None):
        site=self.get_object()
        if not can_write(request.user,site.tenant_id):return Response({"detail":"Editor, admin, or owner role required."},status=403)
        try:version=publish_site(site=site,actor=request.user)
        except SitePayloadError as exc:return Response({"detail":str(exc)},status=status.HTTP_400_BAD_REQUEST)
        return Response(SiteVersionSerializer(version).data)
    @action(detail=True,methods=["get"],url_path="analytics")
    def analytics(self,request,pk=None):
        site=self.get_object();events=site.analytics_events.all();totals=events.values("event_type").annotate(count=Count("id"));targets=events.filter(event_type=AnalyticsEvent.EventType.CTA_CLICK).exclude(target="").values("target").annotate(count=Count("id")).order_by("-count")[:20]
        response={"totals":list(totals),"top_targets":list(targets)}
        if for_tenant(site.tenant).advanced_analytics:response["daily"]=list(events.annotate(day=TruncDate("occurred_at")).values("day","event_type").annotate(count=Count("id")).order_by("day","event_type")[-90:])
        return Response(response)


class DomainViewSet(viewsets.ModelViewSet):
    serializer_class=DomainSerializer;permission_classes=[IsAuthenticated,CanAdministerTenant]
    def get_queryset(self):
        queryset=Domain.objects.filter(tenant_id__in=user_tenant_ids(self.request.user)).select_related("tenant","site").order_by("created_at","id")
        return filter_tenant_param(queryset,self.request)
    def perform_create(self,serializer):
        tenant=serializer.validated_data["tenant"]
        if not can_admin(self.request.user,tenant.id):
            from rest_framework.exceptions import PermissionDenied;raise PermissionDenied("Owner or admin role required.")
        enforce_custom_domain(tenant);site=serializer.validated_data.get("site")
        if site and site.tenant_id!=tenant.id:
            from rest_framework.exceptions import ValidationError;raise ValidationError({"site":"Site must belong to the selected tenant."})
        serializer.save(kind=Domain.Kind.CUSTOM,status=Domain.Status.PENDING)
    @action(detail=True,methods=["get","post"],url_path="verification")
    def verification(self,request,pk=None):
        domain=self.get_object()
        if not can_admin(request.user,domain.tenant_id):return Response({"detail":"Owner or admin role required."},status=403)
        record_name=f"_qr-business.{domain.hostname}";expected=f"qr-business-verification={domain.verification_token}"
        if request.method=="GET":return Response({"hostname":domain.hostname,"record_type":"TXT","record_name":record_name,"record_value":expected,"status":domain.status})
        try:answers=dns.resolver.resolve(record_name,"TXT",lifetime=4.0);observed=[b"".join(answer.strings).decode("utf-8",errors="replace") for answer in answers]
        except (dns.resolver.NXDOMAIN,dns.resolver.NoAnswer,dns.resolver.NoNameservers,dns.exception.Timeout):observed=[]
        verified=expected in observed;domain.status=Domain.Status.VERIFIED if verified else Domain.Status.PENDING;domain.verified_at=timezone.now() if verified else None;domain.save(update_fields=["status","verified_at","updated_at"])
        AuditLog.objects.create(tenant=domain.tenant,actor=request.user,action="domain.verify",object_type="domain",object_id=str(domain.id),metadata={"hostname":domain.hostname,"verified":verified})
        return Response({"hostname":domain.hostname,"verified":verified,"status":domain.status,"observed":observed})


class QRCodeViewSet(viewsets.ModelViewSet):
    serializer_class=QRCodeSerializer;permission_classes=[IsAuthenticated,CanEditTenantObject]
    def get_queryset(self):
        queryset=QRCode.objects.filter(tenant_id__in=user_tenant_ids(self.request.user)).select_related("tenant","site").order_by("created_at","id")
        return filter_tenant_param(queryset,self.request)
    def perform_create(self,serializer):
        tenant=serializer.validated_data["tenant"];site=serializer.validated_data["site"]
        if not can_write(self.request.user,tenant.id):
            from rest_framework.exceptions import PermissionDenied;raise PermissionDenied("Editor, admin, or owner role required.")
        if site.tenant_id!=tenant.id:
            from rest_framework.exceptions import ValidationError;raise ValidationError({"site":"Site must belong to the selected tenant."})
        serializer.save()
    @action(detail=True,methods=["get"],url_path="image")
    def image(self,request,pk=None):
        qr=self.get_object();public_api_base=request.build_absolute_uri("/").rstrip("/");target=f"{public_api_base}/q/{qr.code}/";image_format=str(request.query_params.get("format") or "png").lower()
        if image_format=="svg":
            from qrcode.image.svg import SvgPathImage
            image=qrcode.make(target,image_factory=SvgPathImage);buffer=BytesIO();image.save(buffer);content_type="image/svg+xml";extension="svg"
        else:
            image=qrcode.make(target);buffer=BytesIO();image.save(buffer,format="PNG");content_type="image/png";extension="png"
        response=HttpResponse(buffer.getvalue(),content_type=content_type);response["Content-Disposition"]=f'attachment; filename="{qr.site.slug}-{qr.code}.{extension}"';response["Cache-Control"]="private, max-age=300";return response


class PublicSiteBySlugView(APIView):
    permission_classes=[AllowAny];throttle_scope="public_read"
    def get(self,request,tenant_slug,site_slug):
        site=Site.objects.select_related("tenant","published_version").filter(tenant__slug=tenant_slug,tenant__status__in=ACTIVE_TENANT_STATUSES,slug=site_slug,status=Site.Status.PUBLISHED,published_version__isnull=False).first()
        if not site:return Response({"detail":"Site not found."},status=404)
        response=Response(PublicSiteSerializer(site).data);response["Cache-Control"]="public, max-age=30, stale-while-revalidate=300";return response


class PublicEventView(APIView):
    permission_classes=[AllowAny];throttle_scope="analytics_write"
    def post(self,request,site_id):
        site=Site.objects.select_related("tenant").filter(id=site_id,tenant__status__in=ACTIVE_TENANT_STATUSES,status=Site.Status.PUBLISHED).first()
        if not site:return Response({"detail":"Site not found."},status=404)
        incoming=EventSerializer(data=request.data);incoming.is_valid(raise_exception=True);record_event(request=request,site=site,event_type=incoming.validated_data["event_type"],target=incoming.validated_data.get("target",""),metadata=incoming.validated_data.get("metadata",{}));return Response(status=status.HTTP_204_NO_CONTENT)


class QRRedirectView(APIView):
    permission_classes=[AllowAny];throttle_scope="qr_redirect"
    def get(self,request,code):
        qr=QRCode.objects.select_related("site","site__tenant").filter(code=code,is_active=True,site__status=Site.Status.PUBLISHED,site__tenant__status__in=ACTIVE_TENANT_STATUSES).first()
        if not qr:return Response({"detail":"QR code not found."},status=404)
        record_event(request=request,site=qr.site,qr_code=qr,event_type=AnalyticsEvent.EventType.QR_SCAN,metadata={"campaign":qr.campaign});base=getattr(settings,"PUBLIC_WEB_BASE_URL","http://localhost:3000").rstrip("/");return HttpResponseRedirect(f"{base}/{qr.site.tenant.slug}/{qr.site.slug}")


class HealthView(APIView):
    permission_classes=[AllowAny];throttle_scope="public_read"
    def get(self,request):return Response({"status":"ok","api":"v2"})
