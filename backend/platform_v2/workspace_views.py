from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Membership, QRCode, Tenant
from .serializers import QRCodeSerializer


ACTIVE_TENANT_STATUSES=(Tenant.Status.TRIAL,Tenant.Status.ACTIVE)


def can_access_tenant(user,tenant_id):
    if user.is_staff:return True
    return Membership.objects.filter(user=user,tenant_id=tenant_id,is_active=True,tenant__status__in=ACTIVE_TENANT_STATUSES).exists()


class WorkspacePrimaryQRCodesView(APIView):
    permission_classes=[IsAuthenticated]

    def get(self,request,tenant_id):
        tenant=Tenant.objects.filter(id=tenant_id).first()
        if not tenant or not can_access_tenant(request.user,tenant.id):
            return Response({"detail":"Workspace not found."},status=404)
        rows=(QRCode.objects.filter(tenant=tenant).select_related("tenant","site").order_by("site_id","created_at").distinct("site_id"))
        return Response(QRCodeSerializer(rows,many=True).data)
