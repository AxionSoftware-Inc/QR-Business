from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from platform_v2.models import Domain, QRCode, Site, Tenant


User=get_user_model()


class AdminOverviewTests(TestCase):
    def setUp(self):
        self.staff=User.objects.create_user(username="platform-staff",password="x",is_staff=True)
        self.user=User.objects.create_user(username="ordinary",password="x")
        tenant=Tenant.objects.create(name="Admin stats",slug="admin-stats",status=Tenant.Status.ACTIVE)
        site=Site.objects.create(tenant=tenant,slug="main",name="Main",status=Site.Status.PUBLISHED)
        QRCode.objects.create(tenant=tenant,site=site,label="Main")
        Domain.objects.create(tenant=tenant,site=site,hostname="stats.example.com",kind=Domain.Kind.CUSTOM,status=Domain.Status.VERIFIED)

    def client(self,user):
        client=APIClient();client.force_authenticate(user=user);return client

    def test_staff_receives_database_aggregate_counts(self):
        response=self.client(self.staff).get("/api/v2/admin/overview/")
        self.assertEqual(response.status_code,200)
        payload=response.json()
        self.assertEqual(payload["tenants"],1)
        self.assertEqual(payload["sites"]["total"],1)
        self.assertEqual(payload["sites"]["published"],1)
        self.assertEqual(payload["qr_codes"],1)
        self.assertEqual(payload["verified_domains"],1)

    def test_non_staff_cannot_read_platform_aggregate(self):
        response=self.client(self.user).get("/api/v2/admin/overview/")
        self.assertEqual(response.status_code,403)
