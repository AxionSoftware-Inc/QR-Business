from django.test import RequestFactory, SimpleTestCase, override_settings

from platform_v2.checks import platform_v2_deployment_checks
from platform_v2.services import visitor_hash


class AnalyticsPrivacyTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(ANALYTICS_HASH_SALT="test-analytics-salt", ANALYTICS_TRUST_X_FORWARDED_FOR=False)
    def test_spoofed_forwarded_for_is_ignored_by_default(self):
        first = self.factory.get("/", REMOTE_ADDR="203.0.113.10", HTTP_X_FORWARDED_FOR="1.1.1.1", HTTP_USER_AGENT="agent")
        second = self.factory.get("/", REMOTE_ADDR="203.0.113.10", HTTP_X_FORWARDED_FOR="9.9.9.9", HTTP_USER_AGENT="agent")
        self.assertEqual(visitor_hash(first), visitor_hash(second))

    @override_settings(ANALYTICS_HASH_SALT="test-analytics-salt", ANALYTICS_TRUST_X_FORWARDED_FOR=True)
    def test_forwarded_for_can_be_explicitly_trusted_behind_sanitizing_proxy(self):
        first = self.factory.get("/", REMOTE_ADDR="10.0.0.1", HTTP_X_FORWARDED_FOR="1.1.1.1", HTTP_USER_AGENT="agent")
        second = self.factory.get("/", REMOTE_ADDR="10.0.0.1", HTTP_X_FORWARDED_FOR="9.9.9.9", HTTP_USER_AGENT="agent")
        self.assertNotEqual(visitor_hash(first), visitor_hash(second))


class ProductionDeploymentCheckTests(SimpleTestCase):
    @override_settings(
        DEBUG=False,
        REDIS_URL="",
        S3_BUCKET_NAME="",
        PUBLIC_WEB_BASE_URL="http://example.com",
        SECRET_KEY="shared-secret",
        ANALYTICS_HASH_SALT="shared-secret",
        SENTRY_DSN="",
    )
    def test_unsafe_production_dependencies_are_reported(self):
        ids = {issue.id for issue in platform_v2_deployment_checks(None)}
        self.assertTrue({"platform_v2.E001", "platform_v2.E002", "platform_v2.E003", "platform_v2.E004"}.issubset(ids))
        self.assertIn("platform_v2.W001", ids)

    @override_settings(
        DEBUG=False,
        REDIS_URL="redis://cache:6379/0",
        S3_BUCKET_NAME="qr-business-media",
        PUBLIC_WEB_BASE_URL="https://qr.example.com",
        SECRET_KEY="django-secret",
        ANALYTICS_HASH_SALT="analytics-secret",
        SENTRY_DSN="https://public@example.invalid/1",
    )
    def test_safe_production_configuration_has_no_platform_errors(self):
        issues = platform_v2_deployment_checks(None)
        self.assertFalse([issue for issue in issues if issue.id.startswith("platform_v2.E")])
