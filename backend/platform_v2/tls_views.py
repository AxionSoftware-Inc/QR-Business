from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Domain, Site, Tenant


class TLSApprovalView(APIView):
    """Caddy on-demand TLS ask endpoint.

    Returns 2xx only when the requested custom domain is already verified and
    resolves to an active tenant with a published site. The endpoint carries no
    secrets and never mutates state.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "public_read"

    def get(self, request):
        hostname = str(request.query_params.get("domain") or "").strip().lower().rstrip(".")
        if not hostname or len(hostname) > 253 or "/" in hostname or " " in hostname:
            return Response({"allowed": False}, status=400)
        domain = Domain.objects.select_related("tenant", "site").filter(
            hostname=hostname,
            kind=Domain.Kind.CUSTOM,
            status=Domain.Status.VERIFIED,
            tenant__status__in=[Tenant.Status.TRIAL, Tenant.Status.ACTIVE],
        ).first()
        if not domain:
            return Response({"allowed": False}, status=404)
        if domain.site_id:
            valid = domain.site.status == Site.Status.PUBLISHED and bool(domain.site.published_version_id)
        else:
            valid = Site.objects.filter(tenant=domain.tenant,status=Site.Status.PUBLISHED,published_version__isnull=False).exists()
        return Response({"allowed": True, "domain": hostname}) if valid else Response({"allowed": False}, status=404)
