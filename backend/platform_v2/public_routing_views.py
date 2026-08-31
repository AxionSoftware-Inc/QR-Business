from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Domain, Site, Tenant


class PublicHostResolverView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "public_read"

    def get(self, request):
        hostname = str(request.query_params.get("host") or "").strip().lower().rstrip(".")
        if not hostname or len(hostname) > 253 or "/" in hostname or " " in hostname:
            return Response({"detail": "Invalid host."}, status=400)

        domain = (
            Domain.objects.select_related("tenant", "site")
            .filter(
                hostname=hostname,
                kind=Domain.Kind.CUSTOM,
                status=Domain.Status.VERIFIED,
                tenant__status__in=[Tenant.Status.TRIAL, Tenant.Status.ACTIVE],
            )
            .first()
        )
        if not domain:
            return Response({"detail": "Host not found."}, status=404)

        site = domain.site
        if not site:
            site = (
                Site.objects.filter(
                    tenant=domain.tenant,
                    status=Site.Status.PUBLISHED,
                    published_version__isnull=False,
                )
                .order_by("created_at")
                .first()
            )
        if not site or site.status != Site.Status.PUBLISHED or not site.published_version_id:
            return Response({"detail": "Published site not found."}, status=404)

        response = Response({
            "tenant_slug": domain.tenant.slug,
            "site_slug": site.slug,
        })
        response["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
        return response
