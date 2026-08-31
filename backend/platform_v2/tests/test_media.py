import shutil
import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from platform_v2.models import MediaAsset, Membership, Tenant


TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix="qr-v2-media-test-")
User = get_user_model()


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class MediaAssetApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="media-owner", email="media@example.com")
        self.tenant = Tenant.objects.create(name="Media Tenant", slug="media-tenant")
        Membership.objects.create(tenant=self.tenant, user=self.user, role=Membership.Role.OWNER)
        self.other_tenant = Tenant.objects.create(name="Other Tenant", slug="other-media")
        self.client.force_authenticate(self.user)

    def png_upload(self, name="cover.png"):
        buffer = BytesIO()
        Image.new("RGB", (32, 24), (20, 40, 60)).save(buffer, format="PNG")
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

    def test_valid_image_is_tenant_scoped_and_deduplicated(self):
        first = self.client.post(
            "/api/v2/media/",
            {"tenant": str(self.tenant.id), "file": self.png_upload(), "alt": "Cover"},
            format="multipart",
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data["content_type"], "image/png")
        self.assertEqual(first.data["width"], 32)
        self.assertEqual(first.data["height"], 24)
        self.assertEqual(MediaAsset.objects.count(), 1)

        second = self.client.post(
            "/api/v2/media/",
            {"tenant": str(self.tenant.id), "file": self.png_upload("same.png")},
            format="multipart",
        )
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["id"], first.data["id"])
        self.assertEqual(MediaAsset.objects.count(), 1)

    def test_fake_image_payload_is_rejected_even_with_image_mime(self):
        fake = SimpleUploadedFile("fake.png", b"not-an-image", content_type="image/png")
        response = self.client.post(
            "/api/v2/media/",
            {"tenant": str(self.tenant.id), "file": fake},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_user_cannot_upload_into_unowned_tenant(self):
        response = self.client.post(
            "/api/v2/media/",
            {"tenant": str(self.other_tenant.id), "file": self.png_upload()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(MediaAsset.objects.count(), 0)


def tearDownModule():
    shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)
