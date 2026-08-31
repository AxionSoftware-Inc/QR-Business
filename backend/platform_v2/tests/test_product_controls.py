import hashlib
import hmac
import json
import os
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from platform_v2.models import Domain, Membership, Site, SiteVersion, Tenant

User = get_user_model()


class EntitlementTests(TestCase):
    def setUp(self):
        self.user=User.objects.create_user(username="owner",email="owner@example.com",password="x")
        self.tenant=Tenant.objects.create(name="Free",slug="free-workspace",status=Tenant.Status.ACTIVE,plan=Tenant.Plan.FREE)
        Membership.objects.create(tenant=self.tenant,user=self.user,role=Membership.Role.OWNER)
        self.client=APIClient();self.client.force_authenticate(user=self.user)

    def test_free_plan_rejects_second_site(self):
        Site.objects.create(tenant=self.tenant,slug="one",name="One")
        response=self.client.post("/api/v2/sites/",{"tenant":str(self.tenant.id),"slug":"two","name":"Two"},format="json")
        self.assertEqual(response.status_code,403)

    def test_free_plan_rejects_custom_domain(self):
        site=Site.objects.create(tenant=self.tenant,slug="main",name="Main")
        response=self.client.post("/api/v2/domains/",{"tenant":str(self.tenant.id),"site":str(site.id),"hostname":"example.com"},format="json")
        self.assertEqual(response.status_code,403)


class TeamSecurityTests(TestCase):
    def setUp(self):
        self.owner=User.objects.create_user(username="owner",email="owner@example.com",password="x")
        self.invited=User.objects.create_user(username="invited",email="invited@example.com",password="x")
        self.attacker=User.objects.create_user(username="attacker",email="attacker@example.com",password="x")
        self.tenant=Tenant.objects.create(name="Business",slug="business",status=Tenant.Status.ACTIVE,plan=Tenant.Plan.BUSINESS)
        Membership.objects.create(tenant=self.tenant,user=self.owner,role=Membership.Role.OWNER)

    def client(self,user):
        c=APIClient();c.force_authenticate(user=user);return c

    def test_invite_cannot_be_claimed_by_other_verified_email(self):
        created=self.client(self.owner).post(f"/api/v2/tenants/{self.tenant.id}/team/invitations/",{"email":"invited@example.com","role":"editor"},format="json")
        self.assertEqual(created.status_code,201)
        token=created.json()["token"]
        stolen=self.client(self.attacker).post("/api/v2/team/invitations/accept/",{"token":token},format="json")
        self.assertEqual(stolen.status_code,403)
        accepted=self.client(self.invited).post("/api/v2/team/invitations/accept/",{"token":token},format="json")
        self.assertEqual(accepted.status_code,201)

    def test_owner_cannot_be_removed_without_transfer(self):
        owner_membership=Membership.objects.get(tenant=self.tenant,user=self.owner)
        response=self.client(self.owner).delete(f"/api/v2/team/members/{owner_membership.id}/")
        self.assertEqual(response.status_code,409)

    def test_ownership_transfer_demotes_previous_owner(self):
        target=Membership.objects.create(tenant=self.tenant,user=self.invited,role=Membership.Role.EDITOR)
        response=self.client(self.owner).post(f"/api/v2/tenants/{self.tenant.id}/team/transfer-ownership/",{"membership_id":str(target.id)},format="json")
        self.assertEqual(response.status_code,200)
        target.refresh_from_db();Membership.objects.get(tenant=self.tenant,user=self.owner).refresh_from_db()
        self.assertEqual(target.role,Membership.Role.OWNER)
        self.assertEqual(Membership.objects.get(tenant=self.tenant,user=self.owner).role,Membership.Role.ADMIN)


class BillingWebhookTests(TestCase):
    def setUp(self):
        self.tenant=Tenant.objects.create(name="Billing",slug="billing",status=Tenant.Status.ACTIVE,plan=Tenant.Plan.FREE)
        self.client=APIClient()
        self.secret="a"*48

    def signed(self,payload):
        raw=json.dumps(payload,separators=(",",":")).encode()
        signature=hmac.new(self.secret.encode(),raw,hashlib.sha256).hexdigest()
        return raw,signature

    @patch.dict(os.environ,{"BILLING_WEBHOOK_SECRET":"a"*48})
    def test_signed_event_upgrades_plan_and_is_idempotent(self):
        payload={"event_id":"evt_1","tenant_id":str(self.tenant.id),"plan":"pro","status":"active","provider":"test"}
        raw,sig=self.signed(payload)
        first=self.client.generic("POST","/api/v2/billing/webhook/",raw,content_type="application/json",HTTP_X_QR_BILLING_SIGNATURE=sig)
        self.assertEqual(first.status_code,200)
        self.tenant.refresh_from_db();self.assertEqual(self.tenant.plan,Tenant.Plan.PRO)
        second=self.client.generic("POST","/api/v2/billing/webhook/",raw,content_type="application/json",HTTP_X_QR_BILLING_SIGNATURE=sig)
        self.assertTrue(second.json()["duplicate"])


class TLSApprovalTests(TestCase):
    def setUp(self):
        self.tenant=Tenant.objects.create(name="TLS",slug="tls",status=Tenant.Status.ACTIVE,plan=Tenant.Plan.PRO)
        self.site=Site.objects.create(tenant=self.tenant,slug="main",name="Main",status=Site.Status.PUBLISHED)
        version=SiteVersion.objects.create(site=self.site,version=1,title="Main",blocks=[])
        self.site.published_version=version;self.site.save(update_fields=["published_version"])
        self.domain=Domain.objects.create(tenant=self.tenant,site=self.site,hostname="verified.example.com",kind=Domain.Kind.CUSTOM,status=Domain.Status.VERIFIED,verified_at=timezone.now())

    def test_only_verified_domain_is_approved(self):
        ok=APIClient().get("/api/v2/public/tls-allow/?domain=verified.example.com")
        missing=APIClient().get("/api/v2/public/tls-allow/?domain=evil.example.com")
        self.assertEqual(ok.status_code,200)
        self.assertEqual(missing.status_code,404)
