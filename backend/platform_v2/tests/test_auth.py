from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from platform_v2.models import AuthSession, Identity


@override_settings(CORS_ALLOWED_ORIGINS=["http://localhost:3000"])
class V2AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch.dict("os.environ", {"GOOGLE_CLIENT_ID": "test-client-id", "JWT_REFRESH_COOKIE_SECURE": "False"})
    @patch("platform_v2.auth_views.google_id_token.verify_oauth2_token")
    def test_google_login_requires_server_verified_identity(self, verify):
        verify.return_value = {
            "sub": "google-subject-1",
            "email": "owner@example.com",
            "email_verified": True,
            "given_name": "QR",
            "family_name": "Owner",
        }

        response = self.client.post(
            "/api/v2/auth/google/",
            {"credential": "signed-google-credential"},
            format="json",
            HTTP_ORIGIN="http://localhost:3000",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["access"])
        self.assertEqual(response.json()["user"]["email"], "owner@example.com")
        self.assertEqual(Identity.objects.count(), 1)
        self.assertEqual(AuthSession.objects.filter(revoked_at__isnull=True).count(), 1)
        cookie = response.cookies.get("qr_refresh")
        self.assertIsNotNone(cookie)
        self.assertTrue(cookie["httponly"])

    @patch.dict("os.environ", {"GOOGLE_CLIENT_ID": "test-client-id", "JWT_REFRESH_COOKIE_SECURE": "False"})
    @patch("platform_v2.auth_views.google_id_token.verify_oauth2_token")
    def test_unverified_google_email_is_rejected(self, verify):
        verify.return_value = {
            "sub": "google-subject-2",
            "email": "unverified@example.com",
            "email_verified": False,
        }
        response = self.client.post(
            "/api/v2/auth/google/",
            {"credential": "credential"},
            format="json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(Identity.objects.count(), 0)
        self.assertEqual(AuthSession.objects.count(), 0)

    @patch.dict("os.environ", {"GOOGLE_CLIENT_ID": "test-client-id", "JWT_REFRESH_COOKIE_SECURE": "False"})
    @patch("platform_v2.auth_views.google_id_token.verify_oauth2_token")
    def test_refresh_rotates_and_revokes_previous_session(self, verify):
        verify.return_value = {
            "sub": "google-subject-3",
            "email": "rotate@example.com",
            "email_verified": True,
        }
        login = self.client.post(
            "/api/v2/auth/google/",
            {"credential": "credential"},
            format="json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        old_cookie = login.cookies["qr_refresh"].value
        self.client.cookies["qr_refresh"] = old_cookie

        refreshed = self.client.post(
            "/api/v2/auth/refresh/",
            {},
            format="json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(refreshed.status_code, 200)
        new_cookie = refreshed.cookies["qr_refresh"].value
        self.assertNotEqual(old_cookie, new_cookie)
        self.assertEqual(AuthSession.objects.filter(revoked_at__isnull=False).count(), 1)
        self.assertEqual(AuthSession.objects.filter(revoked_at__isnull=True).count(), 1)

        attacker = APIClient()
        attacker.cookies["qr_refresh"] = old_cookie
        replay = attacker.post(
            "/api/v2/auth/refresh/",
            {},
            format="json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(replay.status_code, 401)
