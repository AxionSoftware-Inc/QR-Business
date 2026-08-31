from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from platform_v2.models import Membership, Site, Tenant
from platform_v2.services import publish_site, save_draft


User = get_user_model()


class PlatformV2SecurityTests(TestCase):
    def setUp(self):
        self.owner_a = User.objects.create_user(username="owner-a", password="strong-pass-a")
        self.owner_b = User.objects.create_user(username="owner-b", password="strong-pass-b")
        self.tenant_a = Tenant.objects.create(name="Tenant A", slug="tenant-a", status=Tenant.Status.ACTIVE)
        self.tenant_b = Tenant.objects.create(name="Tenant B", slug="tenant-b", status=Tenant.Status.ACTIVE)
        Membership.objects.create(tenant=self.tenant_a, user=self.owner_a, role=Membership.Role.OWNER)
        Membership.objects.create(tenant=self.tenant_b, user=self.owner_b, role=Membership.Role.OWNER)
        self.site_a = Site.objects.create(tenant=self.tenant_a, slug="main", name="A main")
        self.site_b = Site.objects.create(tenant=self.tenant_b, slug="main", name="B main")

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_site_list_is_tenant_scoped(self):
        response = self.client_for(self.owner_a).get("/api/v2/sites/")
        self.assertEqual(response.status_code, 200)
        returned_ids = {row["id"] for row in response.json()}
        self.assertIn(str(self.site_a.id), returned_ids)
        self.assertNotIn(str(self.site_b.id), returned_ids)

    def test_cross_tenant_site_detail_is_not_visible(self):
        response = self.client_for(self.owner_a).get(f"/api/v2/sites/{self.site_b.id}/")
        self.assertEqual(response.status_code, 404)

    def test_public_draft_is_not_exposed(self):
        response = APIClient().get("/api/v2/public/sites/tenant-a/main/")
        self.assertEqual(response.status_code, 404)


class PlatformV2PublishingTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="strong-pass")
        self.tenant = Tenant.objects.create(name="Demo", slug="demo", status=Tenant.Status.ACTIVE)
        Membership.objects.create(tenant=self.tenant, user=self.owner, role=Membership.Role.OWNER)
        self.site = Site.objects.create(tenant=self.tenant, slug="main", name="Main")

    def test_publish_creates_immutable_snapshot_and_future_draft_does_not_change_live(self):
        draft_one = save_draft(
            site=self.site,
            actor=self.owner,
            payload={
                "title": "Version one",
                "blocks": [{"id": "hero", "type": "hero", "data": {"headline": "One"}}],
            },
        )
        published = publish_site(site=self.site, actor=self.owner)
        self.assertNotEqual(draft_one.id, published.id)
        self.assertEqual(published.title, "Version one")

        save_draft(
            site=self.site,
            actor=self.owner,
            payload={
                "title": "Version two draft",
                "blocks": [{"id": "hero", "type": "hero", "data": {"headline": "Two"}}],
            },
        )
        self.site.refresh_from_db()
        self.assertEqual(self.site.published_version_id, published.id)
        self.assertEqual(self.site.published_version.title, "Version one")

    def test_public_endpoint_returns_only_published_version(self):
        save_draft(
            site=self.site,
            actor=self.owner,
            payload={"title": "Live title", "blocks": [{"id": "hero", "type": "hero", "data": {}}]},
        )
        publish_site(site=self.site, actor=self.owner)
        response = APIClient().get("/api/v2/public/sites/demo/main/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Live title")
