from django.core.files.storage import default_storage
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class ReadinessView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "public_read"

    def get(self, request):
        checks = {"database": False, "storage": False}
        errors = {}
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                checks["database"] = cursor.fetchone() == (1,)
        except Exception as exc:
            errors["database"] = exc.__class__.__name__
        try:
            default_storage.exists("__qr_business_readiness_probe__")
            checks["storage"] = True
        except Exception as exc:
            errors["storage"] = exc.__class__.__name__
        ready = all(checks.values())
        return Response({"status": "ready" if ready else "not_ready", "checks": checks, "errors": errors}, status=200 if ready else 503)
