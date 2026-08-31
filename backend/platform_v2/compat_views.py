from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AnalyticsEvent, Site, Tenant
from .serializers import PublicSiteSerializer
from .services import record_event


class PublicDefaultSiteView(APIView):
    """Resolve a tenant's default published site using the legacy one-slug URL.

    This endpoint exists only for controlled frontend cutover. New product routes
    should use the explicit tenant + site slug endpoint.
    """

    permission_classes = [AllowAny]
    throttle_scope = "public_read"

    def get(self, request, tenant_slug):
        site = (
            Site.objects.select_related("tenant", "published_version")
            .filter(
                tenant__slug=tenant_slug,
                tenant__status__in=[Tenant.Status.TRIAL, Tenant.Status.ACTIVE],
                status=Site.Status.PUBLISHED,
                published_version__isnull=False,
            )
            .order_by("created_at")
            .first()
        )
        if not site:
            return Response({"detail": "Site not found."}, status=404)

        record_event(request=request, site=site, event_type=AnalyticsEvent.EventType.VIEW)
        response = Response(PublicSiteSerializer(site).data)
        response["Cache-Control"] = "public, max-age=30, stale-while-revalidate=300"
        response["Deprecation"] = "true"
        response["Link"] = f'</api/v2/public/sites/{tenant_slug}/{site.slug}/>; rel="successor-version"'
        return response
