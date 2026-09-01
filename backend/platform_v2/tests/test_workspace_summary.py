from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from platform_v2.models import Membership, QRCode, Site, Tenant


User=get_user_model()


class WorkspacePrimaryQRTests(TestCase):
    def setUp(self):
        self.owner=User.objects.create_user(username="workspace-owner",password="x")
        self.other=User.objects.create_user(username="workspace-other",password="x")
        self.tenant=Tenant.objects.create(name="Workspace",slug="workspace",status=Tenant.Status.ACTIVE,plan=Tenant.Plan.BUSINESS)
        Membership.objects.create(tenant=self.tenant,user=self.owner,role=Membership.Role.OWNER)
        self.site_a=Site.objects.create(tenant=self.tenant,slug="a",name="A")
        self.site_b=Site.objects.create(tenant=self.tenant,slug="b",name="B")
        self.first_a=QRCode.objects.create(tenant=self.tenant,site=self.site_a,label="A first")
        QRCode.objects.create(tenant=self.tenant,site=self.site_a,label="A campaign 2")
        self.first_b=QRCode.objects.create(tenant=self.tenant,site=self.site_b,label="B first")

    def client(self,user):
        client=APIClient();client.force_authenticate(user=user);return client

    def test_returns_only_oldest_primary_qr_per_site(self):
        response=self.client(self.owner).get(f"/api/v2/tenants/{self.tenant.id}/workspace/primary-qr-codes/")
        self.assertEqual(response.status_code,200)
        rows=response.json()
        self.assertEqual(len(rows),2)
        self.assertEqual({row["id"] for row in rows},{str(self.first_a.id),str(self.first_b.id)})

    def test_unrelated_user_cannot_read_workspace_qrs(self):
        response=self.client(self.other).get(f"/api/v2/tenants/{self.tenant.id}/workspace/primary-qr-codes/")
        self.assertEqual(response.status_code,404)
