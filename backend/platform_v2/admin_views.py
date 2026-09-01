from django.db.models import Count, Q
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Domain, QRCode, Site, Tenant


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
