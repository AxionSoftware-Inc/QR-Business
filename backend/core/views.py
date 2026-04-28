from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Domain, Site, Tenant
from .serializers import DomainSerializer, SiteSerializer, TenantSerializer


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

    @action(detail=False, methods=["get"], url_path=r"by-slug/(?P<slug>[-a-zA-Z0-9_]+)")
    def by_slug(self, request, slug: str):
        site = self.get_queryset().filter(tenant__slug=slug).first()

        if not site:
            return Response({"detail": "Site not found."}, status=404)

        return Response(self.get_serializer(site).data)

