from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from platform_v2.models import AnalyticsEvent, Membership, Site, Tenant


User = get_user_model()


class ScalingContractTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="scale-owner", email="scale@example.com", password="x")
        self.tenant = Tenant.objects.create(name="Scale", slug="scale", status=Tenant.Status.ACTIVE, plan=Tenant.Plan.BUSINESS)
        Membership.objects.create(tenant=self.tenant, user=self.owner, role=Membership.Role.OWNER)
        self.site_a = Site.objects.create(tenant=self.tenant, slug="a", name="A")
        self.site_b = Site.objects.create(tenant=self.tenant, slug="b", name="B")
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

    def test_router_lists_use_bounded_pagination(self):
        response = self.client.get("/api/v2/sites/?page_size=9999")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 2)
        self.assertEqual(len(payload["results"]), 2)
        self.assertIn("next", payload)
        self.assertIn("previous", payload)

    def test_tenant_batch_analytics_returns_per_site_totals(self):
        AnalyticsEvent.objects.create(tenant=self.tenant, site=self.site_a, event_type=AnalyticsEvent.EventType.VIEW)
        AnalyticsEvent.objects.create(tenant=self.tenant, site=self.site_a, event_type=AnalyticsEvent.EventType.CTA_CLICK, target="call")
        AnalyticsEvent.objects.create(tenant=self.tenant, site=self.site_b, event_type=AnalyticsEvent.EventType.QR_SCAN)

        response = self.client.get(f"/api/v2/tenants/{self.tenant.id}/analytics/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(sum(row["count"] for row in payload["totals"]), 3)
        self.assertEqual(sum(row["count"] for row in payload["sites"][str(self.site_a.id)]["totals"]), 2)
        self.assertEqual(sum(row["count"] for row in payload["sites"][str(self.site_b.id)]["totals"]), 1)
        self.assertEqual(payload["sites"][str(self.site_a.id)]["top_targets"][0]["target"], "call")

    def test_batch_analytics_cannot_read_another_tenant(self):
        other = Tenant.objects.create(name="Other", slug="scale-other", status=Tenant.Status.ACTIVE)
        response = self.client.get(f"/api/v2/tenants/{other.id}/analytics/")
        self.assertEqual(response.status_code, 404)
