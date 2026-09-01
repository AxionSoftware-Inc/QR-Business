from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .access import can_access_tenant
from .models import QRCode, Tenant
from .serializers import QRCodeSerializer


class WorkspacePrimaryQRCodesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tenant_id):
        tenant = Tenant.objects.filter(id=tenant_id).first()
        if not tenant or not can_access_tenant(request.user, tenant.id):
            return Response({"detail": "Workspace not found."}, status=404)
        rows = (
            QRCode.objects.filter(tenant=tenant)
            .select_related("tenant", "site")
            .order_by("site_id", "created_at")
            .distinct("site_id")
        )
        return Response(QRCodeSerializer(rows, many=True).data)
