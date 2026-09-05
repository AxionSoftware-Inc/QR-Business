import hashlib
import hmac
import json
import os

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog, Tenant


VALID_SUBSCRIPTION_STATUSES = {"trial", "active", "past_due", "canceled"}


def _signature(secret: str, raw: bytes) -> str:
    return hmac.new(secret.encode("utf-8"), raw, hashlib.sha256).hexdigest()


class BillingWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "billing_webhook"

    @transaction.atomic
    def post(self, request):
        secret = os.getenv("BILLING_WEBHOOK_SECRET", "").strip()
        if len(secret) < 32:
            return Response({"detail": "Billing webhook is not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        raw = request.body
        supplied = request.headers.get("X-QR-Billing-Signature", "").strip().lower()
        if not supplied or not hmac.compare_digest(supplied, _signature(secret, raw)):
            return Response({"detail": "Invalid billing signature."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return Response({"detail": "Invalid JSON payload."}, status=status.HTTP_400_BAD_REQUEST)

        event_id = str(payload.get("event_id") or "").strip()[:64]
        tenant_id = str(payload.get("tenant_id") or "").strip()
        plan = str(payload.get("plan") or "").strip()
        subscription_status = str(payload.get("status") or "").strip()
        provider = str(payload.get("provider") or "unknown").strip()[:40]
        provider_subscription_id = str(payload.get("subscription_id") or "").strip()[:120]

        if not event_id or not tenant_id:
            return Response({"detail": "event_id and tenant_id are required."}, status=400)
        if plan not in Tenant.Plan.values:
            return Response({"detail": "Unknown plan."}, status=400)
        if subscription_status not in VALID_SUBSCRIPTION_STATUSES:
            return Response({"detail": "Unknown subscription status."}, status=400)

        tenant = Tenant.objects.select_for_update().filter(id=tenant_id).first()
        if not tenant:
            return Response({"detail": "Tenant not found."}, status=404)

        if AuditLog.objects.filter(tenant=tenant, action="billing.webhook", object_id=event_id).exists():
            return Response({"processed": True, "duplicate": True, "plan": tenant.plan, "tenant_status": tenant.status})

        if subscription_status == "active":
            tenant.plan = plan
            tenant.status = Tenant.Status.ACTIVE
        elif subscription_status == "trial":
            tenant.plan = plan
            tenant.status = Tenant.Status.TRIAL
        elif subscription_status == "past_due":
            tenant.plan = plan
            tenant.status = Tenant.Status.SUSPENDED
        else:
            tenant.plan = Tenant.Plan.FREE
            tenant.status = Tenant.Status.ACTIVE
        tenant.save(update_fields=["plan", "status", "updated_at"])

        AuditLog.objects.create(
            tenant=tenant,
            action="billing.webhook",
            object_type="billing_event",
            object_id=event_id,
            metadata={
                "provider": provider,
                "subscription_id": provider_subscription_id,
                "subscription_status": subscription_status,
                "plan": tenant.plan,
            },
        )
        return Response({"processed": True, "duplicate": False, "plan": tenant.plan, "tenant_status": tenant.status})
