import json
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

from platform_v2.models import Domain, QRCode, Site, SiteVersion, Tenant


class TenantExportTests(TestCase):
    def test_export_contains_business_data_but_not_domain_verification_secret(self):
        tenant = Tenant.objects.create(name="Export Co", slug="export-co", status=Tenant.Status.ACTIVE)
        site = Site.objects.create(tenant=tenant, slug="main", name="Main")
        version = SiteVersion.objects.create(site=site, version=1, title="Export title", blocks=[], theme={}, seo={})
        site.draft_version = version
        site.save(update_fields=["draft_version", "updated_at"])
        domain = Domain.objects.create(tenant=tenant, site=site, hostname="export.example.com", kind=Domain.Kind.CUSTOM)
        QRCode.objects.create(tenant=tenant, site=site, label="Export QR", campaign="default")

        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "tenant.json"
            call_command("export_tenant_v2", "--tenant", tenant.slug, "--output", str(output))
            payload = json.loads(output.read_text(encoding="utf-8"))
            raw = output.read_text(encoding="utf-8")

            self.assertEqual(payload["schema"], "qr-business-v2-tenant-export/1")
            self.assertEqual(payload["tenant"]["slug"], tenant.slug)
            self.assertEqual(payload["sites"][0]["versions"][0]["title"], "Export title")
            self.assertEqual(payload["domains"][0]["hostname"], domain.hostname)
            self.assertNotIn(domain.verification_token, raw)
            self.assertIn("auth_sessions", payload["excluded_sensitive_classes"])
            self.assertTrue(output.with_suffix(".json.sha256").exists())
