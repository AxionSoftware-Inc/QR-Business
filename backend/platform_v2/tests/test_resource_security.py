from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from platform_v2.models import Domain, Membership, QRCode, Site, Tenant


User = get_user_model()


class ResourceSecurityTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner-resource", email="owner-resource@example.com", password="x")
        self.other_owner = User.objects.create_user(username="other-owner", email="other-owner@example.com", password="x")
        self.tenant = Tenant.objects.create(name="Primary", slug="primary-resource", status=Tenant.Status.ACTIVE, plan=Tenant.Plan.PRO)
        self.other_tenant = Tenant.objects.create(name="Other", slug="other-resource", status=Tenant.Status.ACTIVE, plan=Tenant.Plan.PRO)
        Membership.objects.create(tenant=self.tenant, user=self.owner, role=Membership.Role.OWNER)
        Membership.objects.create(tenant=self.other_tenant, user=self.other_owner, role=Membership.Role.OWNER)
        self.site = Site.objects.create(tenant=self.tenant, slug="main", name="Main")
        self.other_site = Site.objects.create(tenant=self.other_tenant, slug="main", name="Other main")
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

    @override_settings(PUBLIC_WEB_BASE_URL="https://qr.example.com")
    def test_custom_domain_rejects_urls_ips_and_platform_hosts(self):
        invalid = [
            "https://customer.example.com/path",
            "127.0.0.1",
            "localhost",
            "qr.example.com",
            "tenant.qr.example.com",
            "bad_label.example.com",
        ]
        for hostname in invalid:
            with self.subTest(hostname=hostname):
                response = self.client.post(
                    "/api/v2/domains/",
                    {"tenant": str(self.tenant.id), "site": str(self.site.id), "hostname": hostname},
                    format="json",
                )
                self.assertEqual(response.status_code, 400)

    def test_custom_domain_is_idna_normalized(self):
        response = self.client.post(
            "/api/v2/domains/",
            {"tenant": str(self.tenant.id), "site": str(self.site.id), "hostname": "täst.example"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["hostname"], "xn--tst-qla.example")

    def test_domain_cannot_move_to_another_tenant_or_site(self):
        domain = Domain.objects.create(
            tenant=self.tenant,
            site=self.site,
            hostname="owned.example.com",
            kind=Domain.Kind.CUSTOM,
            status=Domain.Status.PENDING,
        )
        tenant_move = self.client.patch(
            f"/api/v2/domains/{domain.id}/",
            {"tenant": str(self.other_tenant.id)},
            format="json",
        )
        site_move = self.client.patch(
            f"/api/v2/domains/{domain.id}/",
            {"site": str(self.other_site.id)},
            format="json",
        )
        self.assertEqual(tenant_move.status_code, 400)
        self.assertEqual(site_move.status_code, 400)
        domain.refresh_from_db()
        self.assertEqual(domain.tenant_id, self.tenant.id)
        self.assertEqual(domain.site_id, self.site.id)

    def test_verified_domain_hostname_change_resets_proof_and_rotates_token(self):
        domain = Domain.objects.create(
            tenant=self.tenant,
            site=self.site,
            hostname="old.example.com",
            kind=Domain.Kind.CUSTOM,
            status=Domain.Status.VERIFIED,
            verified_at=timezone.now(),
        )
        old_token = domain.verification_token
        response = self.client.patch(
            f"/api/v2/domains/{domain.id}/",
            {"hostname": "new.example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        domain.refresh_from_db()
        self.assertEqual(domain.hostname, "new.example.com")
        self.assertEqual(domain.status, Domain.Status.PENDING)
        self.assertIsNone(domain.verified_at)
        self.assertNotEqual(domain.verification_token, old_token)

    def test_qr_cannot_move_between_tenants_or_target_foreign_site(self):
        qr = QRCode.objects.create(tenant=self.tenant, site=self.site, label="Owned")
        tenant_move = self.client.patch(
            f"/api/v2/qr-codes/{qr.id}/",
            {"tenant": str(self.other_tenant.id)},
            format="json",
        )
        site_move = self.client.patch(
            f"/api/v2/qr-codes/{qr.id}/",
            {"site": str(self.other_site.id)},
            format="json",
        )
        self.assertEqual(tenant_move.status_code, 400)
        self.assertEqual(site_move.status_code, 400)
        qr.refresh_from_db()
        self.assertEqual(qr.tenant_id, self.tenant.id)
        self.assertEqual(qr.site_id, self.site.id)

    def test_free_plan_enforces_active_qr_limit(self):
        self.tenant.plan = Tenant.Plan.FREE
        self.tenant.save(update_fields=["plan", "updated_at"])
        for index in range(5):
            response = self.client.post(
                "/api/v2/qr-codes/",
                {"tenant": str(self.tenant.id), "site": str(self.site.id), "label": f"QR {index}"},
                format="json",
            )
            self.assertEqual(response.status_code, 201)
        blocked = self.client.post(
            "/api/v2/qr-codes/",
            {"tenant": str(self.tenant.id), "site": str(self.site.id), "label": "Too many"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 403)

    def test_deactivate_create_reactivate_cannot_bypass_qr_limit(self):
        self.tenant.plan = Tenant.Plan.FREE
        self.tenant.save(update_fields=["plan", "updated_at"])
        old = QRCode.objects.create(tenant=self.tenant, site=self.site, label="Old", is_active=False)
        for index in range(5):
            response = self.client.post(
                "/api/v2/qr-codes/",
                {"tenant": str(self.tenant.id), "site": str(self.site.id), "label": f"Active {index}"},
                format="json",
            )
            self.assertEqual(response.status_code, 201)
        reactivated = self.client.patch(
            f"/api/v2/qr-codes/{old.id}/",
            {"is_active": True},
            format="json",
        )
        self.assertEqual(reactivated.status_code, 403)
        old.refresh_from_db()
        self.assertFalse(old.is_active)
