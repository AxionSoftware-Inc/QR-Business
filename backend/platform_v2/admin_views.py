from django.db.models import Count, Q
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog, Domain, QRCode, Site, Tenant
from .serializers import SiteSerializer


class AdminPagePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


class PlatformAdminOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        site_counts = Site.objects.aggregate(
            total=Count("id"),
            published=Count("id", filter=Q(status=Site.Status.PUBLISHED)),
            draft=Count("id", filter=Q(status=Site.Status.DRAFT)),
            disabled=Count("id", filter=Q(status=Site.Status.DISABLED)),
        )
        return Response({
            "tenants": Tenant.objects.count(),
            "sites": site_counts,
            "qr_codes": QRCode.objects.count(),
            "active_qr_codes": QRCode.objects.filter(is_active=True).count(),
            "custom_domains": Domain.objects.filter(kind=Domain.Kind.CUSTOM).count(),
            "verified_domains": Domain.objects.filter(kind=Domain.Kind.CUSTOM, status=Domain.Status.VERIFIED).count(),
        })


class PlatformAdminSiteListView(APIView):
    """Bounded staff-only site browser for operational support."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        rows = Site.objects.select_related("tenant", "draft_version", "published_version").order_by("-updated_at", "id")
        query = str(request.query_params.get("q") or "").strip()
        status_value = str(request.query_params.get("status") or "").strip().lower()
        if query:
            rows = rows.filter(
                Q(name__icontains=query)
                | Q(slug__icontains=query)
                | Q(tenant__name__icontains=query)
                | Q(tenant__slug__icontains=query)
            )
        if status_value in {Site.Status.DRAFT, Site.Status.PUBLISHED, Site.Status.DISABLED}:
            rows = rows.filter(status=status_value)

        paginator = AdminPagePagination()
        page = paginator.paginate_queryset(rows, request, view=self)
        return paginator.get_paginated_response(SiteSerializer(page, many=True).data)


class PlatformAdminAuditLogView(APIView):
    """Read-only forensic trail. Secrets are intentionally never serialized here."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        rows = AuditLog.objects.select_related("tenant", "actor").order_by("-created_at", "id")
        query = str(request.query_params.get("q") or "").strip()
        action = str(request.query_params.get("action") or "").strip()
        tenant_id = str(request.query_params.get("tenant") or "").strip()
        if query:
            rows = rows.filter(
                Q(action__icontains=query)
                | Q(object_type__icontains=query)
                | Q(object_id__icontains=query)
                | Q(tenant__name__icontains=query)
                | Q(actor__email__icontains=query)
            )
        if action:
            rows = rows.filter(action=action)
        if tenant_id:
            rows = rows.filter(tenant_id=tenant_id)

        paginator = AdminPagePagination()
        page = paginator.paginate_queryset(rows, request, view=self)
        payload = [
            {
                "id": str(row.id),
                "tenant_id": str(row.tenant_id) if row.tenant_id else None,
                "tenant_name": row.tenant.name if row.tenant else None,
                "actor_id": str(row.actor_id) if row.actor_id else None,
                "actor_email": row.actor.email if row.actor else None,
                "action": row.action,
                "object_type": row.object_type,
                "object_id": row.object_id,
                "metadata": row.metadata,
                "created_at": row.created_at.isoformat(),
            }
            for row in page
        ]
        return paginator.get_paginated_response(payload)
