import hashlib
import hmac
import json
import os
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from platform_v2.models import AuditLog, Domain, Membership, Site, SiteVersion, Tenant

User = get_user_model()


class PlanCatalogTests(TestCase):
    def test_public_catalog_matches_server_entitlements(self):
        response = APIClient().get("/api/v2/plans/")
        self.assertEqual(response.status_code, 200)
        plans = {row["key"]: row for row in response.json()["plans"]}
        self.assertEqual(set(plans), {"free", "starter", "pro", "business"})
        self.assertEqual(plans["free"]["limits"]["sites"], 1)
        self.assertFalse(plans["free"]["features"]["custom_domains"])
        self.assertTrue(plans["pro"]["features"]["custom_domains"])
        self.assertEqual(plans["business"]["limits"]["members"], 25)


class EntitlementTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="owner", email="owner@example.com", password="x")
        self.tenant = Tenant.objects.create(name="Free", slug="free-workspace", status=Tenant.Status.ACTIVE, plan=Tenant.Plan.FREE)
        Membership.objects.create(tenant=self.tenant, user=self.user, role=Membership.Role.OWNER)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_free_plan_rejects_second_site(self):
        Site.objects.create(tenant=self.tenant, slug="one", name="One")
        response = self.client.post("/api/v2/sites/", {"tenant": str(self.tenant.id), "slug": "two", "name": "Two"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_free_plan_rejects_custom_domain(self):
        site = Site.objects.create(tenant=self.tenant, slug="main", name="Main")
        response = self.client.post("/api/v2/domains/", {"tenant": str(self.tenant.id), "site": str(site.id), "hostname": "example.com"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_entitlement_usage_is_server_calculated(self):
        Site.objects.create(tenant=self.tenant, slug="one", name="One")
        response = self.client.get(f"/api/v2/tenants/{self.tenant.id}/entitlements/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["usage"]["sites"], 1)
        self.assertEqual(response.json()["usage"]["members"], 1)


class TeamSecurityTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", email="owner@example.com", password="x")
        self.invited = User.objects.create_user(username="invited", email="invited@example.com", password="x")
        self.attacker = User.objects.create_user(username="attacker", email="attacker@example.com", password="x")
        self.tenant = Tenant.objects.create(name="Business", slug="business", status=Tenant.Status.ACTIVE, plan=Tenant.Plan.BUSINESS)
        Membership.objects.create(tenant=self.tenant, user=self.owner, role=Membership.Role.OWNER)

    def client(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_invite_cannot_be_claimed_by_other_verified_email(self):
        created = self.client(self.owner).post(f"/api/v2/tenants/{self.tenant.id}/team/invitations/", {"email": "invited@example.com", "role": "editor"}, format="json")
        self.assertEqual(created.status_code, 201)
        token = created.json()["token"]
        stolen = self.client(self.attacker).post("/api/v2/team/invitations/accept/", {"token": token}, format="json")
        self.assertEqual(stolen.status_code, 403)
        accepted = self.client(self.invited).post("/api/v2/team/invitations/accept/", {"token": token}, format="json")
        self.assertEqual(accepted.status_code, 201)

    def test_invite_token_is_not_returned_when_listing(self):
        created = self.client(self.owner).post(f"/api/v2/tenants/{self.tenant.id}/team/invitations/", {"email": "invited@example.com", "role": "editor"}, format="json")
        self.assertIn("token", created.json())
        listed = self.client(self.owner).get(f"/api/v2/tenants/{self.tenant.id}/team/invitations/")
        self.assertEqual(listed.status_code, 200)
        self.assertNotIn("token", listed.json()[0])

    def test_owner_cannot_be_removed_without_transfer(self):
        owner_membership = Membership.objects.get(tenant=self.tenant, user=self.owner)
        response = self.client(self.owner).delete(f"/api/v2/team/members/{owner_membership.id}/")
        self.assertEqual(response.status_code, 409)

    def test_ownership_transfer_demotes_previous_owner(self):
        target = Membership.objects.create(tenant=self.tenant, user=self.invited, role=Membership.Role.EDITOR)
        response = self.client(self.owner).post(f"/api/v2/tenants/{self.tenant.id}/team/transfer-ownership/", {"membership_id": str(target.id)}, format="json")
        self.assertEqual(response.status_code, 200)
        target.refresh_from_db()
        previous = Membership.objects.get(tenant=self.tenant, user=self.owner)
        self.assertEqual(target.role, Membership.Role.OWNER)
        self.assertEqual(previous.role, Membership.Role.ADMIN)


class BillingWebhookTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Billing", slug="billing", status=Tenant.Status.ACTIVE, plan=Tenant.Plan.FREE)
        self.client = APIClient()
        self.secret = "a" * 48

    def signed(self, payload):
        raw = json.dumps(payload, separators=(",", ":")).encode()
        signature = hmac.new(self.secret.encode(), raw, hashlib.sha256).hexdigest()
        return raw, signature

    @patch.dict(os.environ, {"BILLING_WEBHOOK_SECRET": "a" * 48})
    def test_signed_event_upgrades_plan_and_is_idempotent(self):
        payload = {"event_id": "evt_1", "tenant_id": str(self.tenant.id), "plan": "pro", "status": "active", "provider": "test"}
        raw, signature = self.signed(payload)
        first = self.client.generic("POST", "/api/v2/billing/webhook/", raw, content_type="application/json", HTTP_X_QR_BILLING_SIGNATURE=signature)
        self.assertEqual(first.status_code, 200)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.plan, Tenant.Plan.PRO)
        second = self.client.generic("POST", "/api/v2/billing/webhook/", raw, content_type="application/json", HTTP_X_QR_BILLING_SIGNATURE=signature)
        self.assertTrue(second.json()["duplicate"])
        self.assertEqual(AuditLog.objects.filter(tenant=self.tenant, action="billing.webhook", object_id="evt_1").count(), 1)

    @patch.dict(os.environ, {"BILLING_WEBHOOK_SECRET": "a" * 48})
    def test_invalid_signature_cannot_change_plan(self):
        payload = {"event_id": "evt_bad", "tenant_id": str(self.tenant.id), "plan": "business", "status": "active", "provider": "test"}
        raw, _ = self.signed(payload)
        response = self.client.generic("POST", "/api/v2/billing/webhook/", raw, content_type="application/json", HTTP_X_QR_BILLING_SIGNATURE="0" * 64)
        self.assertEqual(response.status_code, 401)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.plan, Tenant.Plan.FREE)

    @patch.dict(os.environ, {"BILLING_WEBHOOK_SECRET": "a" * 48})
    def test_canceled_subscription_returns_tenant_to_free(self):
        self.tenant.plan = Tenant.Plan.PRO
        self.tenant.save(update_fields=["plan", "updated_at"])
        payload = {"event_id": "evt_cancel", "tenant_id": str(self.tenant.id), "plan": "pro", "status": "canceled", "provider": "test"}
        raw, signature = self.signed(payload)
        response = self.client.generic("POST", "/api/v2/billing/webhook/", raw, content_type="application/json", HTTP_X_QR_BILLING_SIGNATURE=signature)
        self.assertEqual(response.status_code, 200)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.plan, Tenant.Plan.FREE)


class TLSApprovalTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="TLS", slug="tls", status=Tenant.Status.ACTIVE, plan=Tenant.Plan.PRO)
        self.site = Site.objects.create(tenant=self.tenant, slug="main", name="Main", status=Site.Status.PUBLISHED)
        version = SiteVersion.objects.create(site=self.site, version=1, title="Main", blocks=[])
        self.site.published_version = version
        self.site.save(update_fields=["published_version"])
        self.domain = Domain.objects.create(tenant=self.tenant, site=self.site, hostname="verified.example.com", kind=Domain.Kind.CUSTOM, status=Domain.Status.VERIFIED, verified_at=timezone.now())

    def test_only_verified_domain_is_approved(self):
        ok = APIClient().get("/api/v2/public/tls-allow/?domain=verified.example.com")
        missing = APIClient().get("/api/v2/public/tls-allow/?domain=evil.example.com")
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(missing.status_code, 404)

    def test_pending_domain_is_not_approved(self):
        Domain.objects.create(tenant=self.tenant, site=self.site, hostname="pending.example.com", kind=Domain.Kind.CUSTOM, status=Domain.Status.PENDING)
        response = APIClient().get("/api/v2/public/tls-allow/?domain=pending.example.com")
        self.assertEqual(response.status_code, 404)

    def test_plan_downgrade_disables_verified_custom_domain_and_tls(self):
        self.tenant.plan = Tenant.Plan.FREE
        self.tenant.save(update_fields=["plan", "updated_at"])
        resolver = APIClient().get("/api/v2/public/resolve-host/?host=verified.example.com")
        tls = APIClient().get("/api/v2/public/tls-allow/?domain=verified.example.com")
        self.assertEqual(resolver.status_code, 404)
        self.assertEqual(tls.status_code, 404)
