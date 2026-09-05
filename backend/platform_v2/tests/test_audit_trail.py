from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from platform_v2.models import AuditLog, Domain, Membership, QRCode, Site, Tenant
from platform_v2.services import publish_site, save_draft


User = get_user_model()


class AuditTrailTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="audit-owner", email="audit@example.com", password="strong-pass")
        self.tenant = Tenant.objects.create(name="Audit", slug="audit", status=Tenant.Status.ACTIVE, plan=Tenant.Plan.BUSINESS)
        Membership.objects.create(tenant=self.tenant, user=self.user, role=Membership.Role.OWNER)
        self.site = Site.objects.create(tenant=self.tenant, slug="main", name="Main")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_domain_create_and_hostname_change_are_audited_without_verification_secret(self):
        created = self.client.post(
            "/api/v2/domains/",
            {"tenant": str(self.tenant.id), "site": str(self.site.id), "hostname": "audit.example.com"},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        domain = Domain.objects.get(id=created.json()["id"])
        first = AuditLog.objects.filter(action="domain.created", object_id=str(domain.id)).latest("created_at")
        self.assertEqual(first.actor_id, self.user.id)
        self.assertNotIn("verification_token", first.metadata)
        self.assertNotIn(domain.verification_token, str(first.metadata))

        changed = self.client.patch(
            f"/api/v2/domains/{domain.id}/",
            {"hostname": "new-audit.example.com"},
            format="json",
        )
        self.assertEqual(changed.status_code, 200)
        domain.refresh_from_db()
        update = AuditLog.objects.filter(action="domain.updated", object_id=str(domain.id)).latest("created_at")
        self.assertTrue(update.metadata["verification_reset"])
        self.assertNotIn(domain.verification_token, str(update.metadata))

    def test_qr_create_and_mutation_are_audited(self):
        created = self.client.post(
            "/api/v2/qr-codes/",
            {"tenant": str(self.tenant.id), "site": str(self.site.id), "label": "Poster", "campaign": "launch"},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        qr = QRCode.objects.get(id=created.json()["id"])
        self.assertTrue(AuditLog.objects.filter(action="qr.created", object_id=str(qr.id), actor=self.user).exists())

        changed = self.client.patch(
            f"/api/v2/qr-codes/{qr.id}/",
            {"campaign": "autumn", "is_active": False},
            format="json",
        )
        self.assertEqual(changed.status_code, 200)
        update = AuditLog.objects.filter(action="qr.updated", object_id=str(qr.id)).latest("created_at")
        self.assertEqual(update.metadata["before"]["campaign"], "launch")
        self.assertEqual(update.metadata["after"]["campaign"], "autumn")
        self.assertFalse(update.metadata["after"]["is_active"])

    def test_site_draft_and_publish_are_audited(self):
        save_draft(
            site=self.site,
            actor=self.user,
            payload={"title": "Audit live", "blocks": [{"id": "hero", "type": "hero", "data": {}}]},
        )
        publish_site(site=self.site, actor=self.user)
        actions = set(AuditLog.objects.filter(object_id=str(self.site.id)).values_list("action", flat=True))
        self.assertIn("site.draft_saved", actions)
        self.assertIn("site.published", actions)
