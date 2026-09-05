from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from platform_v2.analytics import site_analytics
from platform_v2.models import AnalyticsDailyRollup, AnalyticsEvent, AuditLog, Domain, Site, Tenant


User = get_user_model()


class AdminOperationsTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(username="ops-staff", password="x", is_staff=True)
        self.tenant = Tenant.objects.create(name="Acme Operations", slug="acme-ops", status=Tenant.Status.ACTIVE)
        for index in range(55):
            Site.objects.create(tenant=self.tenant, slug=f"site-{index}", name=f"Operations Site {index}")
        AuditLog.objects.create(
            tenant=self.tenant,
            actor=self.staff,
            action="site.published",
            object_type="site",
            object_id="example",
            metadata={"version": 2},
        )

    def client(self):
        client = APIClient()
        client.force_authenticate(user=self.staff)
        return client

    def test_admin_site_browser_is_bounded_searchable_and_paginated(self):
        first = self.client().get("/api/v2/admin/sites/?page_size=50")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["count"], 55)
        self.assertEqual(len(first.json()["results"]), 50)
        self.assertTrue(first.json()["next"])

        search = self.client().get("/api/v2/admin/sites/?q=Operations%20Site%2054")
        self.assertEqual(search.status_code, 200)
        self.assertEqual(search.json()["count"], 1)
        self.assertEqual(search.json()["results"][0]["slug"], "site-54")

    def test_admin_audit_browser_returns_bounded_forensic_shape(self):
        response = self.client().get("/api/v2/admin/audit/?q=published")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        row = payload["results"][0]
        self.assertEqual(row["action"], "site.published")
        self.assertEqual(row["tenant_name"], "Acme Operations")
        self.assertEqual(row["metadata"], {"version": 2})
        self.assertNotIn("verification_token", row)


class MaintenanceCommandTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Maintenance", slug="maintenance", status=Tenant.Status.ACTIVE)
        self.site = Site.objects.create(tenant=self.tenant, slug="main", name="Main")

    def old_event(self, event_type, target=""):
        event = AnalyticsEvent.objects.create(tenant=self.tenant, site=self.site, event_type=event_type, target=target)
        AnalyticsEvent.objects.filter(id=event.id).update(occurred_at=timezone.now() - timedelta(days=500))
        return event

    def test_prune_analytics_is_dry_run_by_default(self):
        event = self.old_event(AnalyticsEvent.EventType.VIEW)
        output = StringIO()
        call_command("prune_analytics_v2", "--days", "365", stdout=output)
        self.assertTrue(AnalyticsEvent.objects.filter(id=event.id).exists())
        self.assertEqual(AnalyticsDailyRollup.objects.count(), 0)
        self.assertIn("DRY-RUN", output.getvalue())

    def test_compaction_preserves_totals_and_top_targets(self):
        self.old_event(AnalyticsEvent.EventType.VIEW)
        self.old_event(AnalyticsEvent.EventType.VIEW)
        self.old_event(AnalyticsEvent.EventType.QR_SCAN)
        self.old_event(AnalyticsEvent.EventType.CTA_CLICK, "call")
        self.old_event(AnalyticsEvent.EventType.CTA_CLICK, "call")
        self.old_event(AnalyticsEvent.EventType.CTA_CLICK, "map")

        before = site_analytics(self.site, advanced=True, daily_days=1000)
        call_command("prune_analytics_v2", "--days", "365", "--apply", stdout=StringIO())
        after = site_analytics(self.site, advanced=True, daily_days=1000)

        self.assertEqual(AnalyticsEvent.objects.filter(site=self.site).count(), 0)
        self.assertGreater(AnalyticsDailyRollup.objects.filter(site=self.site).count(), 0)
        self.assertEqual(before["totals"], after["totals"])
        self.assertEqual(before["top_targets"], after["top_targets"])
        self.assertEqual(before["daily"], after["daily"])
        self.assertTrue(AuditLog.objects.filter(action="analytics.retention_compact").exists())

    @patch("platform_v2.management.commands.verify_pending_domains_v2.dns.resolver.resolve")
    def test_domain_batch_verifier_is_dry_run_then_apply(self, resolve):
        domain = Domain.objects.create(
            tenant=self.tenant,
            site=self.site,
            hostname="maintenance.example.com",
            kind=Domain.Kind.CUSTOM,
            status=Domain.Status.PENDING,
        )

        class Answer:
            strings = [f"qr-business-verification={domain.verification_token}".encode()]

        resolve.return_value = [Answer()]
        call_command("verify_pending_domains_v2", "--hostname", domain.hostname, stdout=StringIO())
        domain.refresh_from_db()
        self.assertEqual(domain.status, Domain.Status.PENDING)

        call_command("verify_pending_domains_v2", "--hostname", domain.hostname, "--apply", stdout=StringIO())
        domain.refresh_from_db()
        self.assertEqual(domain.status, Domain.Status.VERIFIED)
        self.assertIsNotNone(domain.verified_at)
        self.assertTrue(AuditLog.objects.filter(action="domain.verify_batch", object_id=str(domain.id)).exists())
