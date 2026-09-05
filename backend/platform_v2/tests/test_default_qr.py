from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from platform_v2.models import Membership, QRCode, Site, Tenant


User = get_user_model()


class DefaultQRCodeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="default-qr-owner", email="qr@example.com")
        self.tenant = Tenant.objects.create(name="Default QR", slug="default-qr", status=Tenant.Status.ACTIVE, plan=Tenant.Plan.PRO)
        Membership.objects.create(tenant=self.tenant, user=self.user, role=Membership.Role.OWNER)
        self.site = Site.objects.create(tenant=self.tenant, slug="main", name="Main")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_repeated_default_qr_create_returns_same_resource_without_consuming_quota(self):
        payload = {"tenant": str(self.tenant.id), "site": str(self.site.id), "label": "Main", "campaign": "default"}
        first = self.client.post("/api/v2/qr-codes/", payload, format="json")
        second = self.client.post("/api/v2/qr-codes/", payload, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.assertEqual(QRCode.objects.filter(site=self.site, campaign="default").count(), 1)

    def test_non_default_campaigns_can_still_create_multiple_qr_resources(self):
        base = {"tenant": str(self.tenant.id), "site": str(self.site.id), "campaign": "menu"}
        first = self.client.post("/api/v2/qr-codes/", {**base, "label": "Menu A"}, format="json")
        second = self.client.post("/api/v2/qr-codes/", {**base, "label": "Menu B"}, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertNotEqual(first.json()["id"], second.json()["id"])
