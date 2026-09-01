import unittest
from io import StringIO

from django.apps import apps
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from platform_v2.models import Domain, Site, SiteVersion, Tenant


LEGACY_ENABLED = apps.is_installed("core")


@unittest.skipUnless(LEGACY_ENABLED, "Legacy migration tests require ENABLE_LEGACY_IMPORT=True")
class LegacyMigrationTests(TestCase):
    def setUp(self):
        self.LegacyTenant = apps.get_model("core", "Tenant")
        self.LegacySite = apps.get_model("core", "Site")
        self.LegacyDomain = apps.get_model("core", "Domain")

    def create_legacy_fixture(self, *, slug="legacy-shop"):
        legacy_tenant = self.LegacyTenant.objects.create(
            name="Legacy Shop",
            slug=slug,
            owner_contact="owner@example.com",
            status="active",
            plan="pro",
        )
        legacy_site = self.LegacySite.objects.create(
            tenant=legacy_tenant,
            title="Legacy Shop",
            description="Imported description",
            template_key="pro",
            status="published",
            theme={"primaryColor": "#111827"},
            blocks=[{"id": "hero", "type": "hero", "enabled": True, "data": {}}],
            published_at=timezone.now(),
        )
        self.LegacyDomain.objects.create(
            tenant=legacy_tenant,
            hostname="legacy.example.com",
            type="custom",
            status="verified",
            verified_at=timezone.now(),
        )
        return legacy_tenant, legacy_site

    def test_default_dry_run_rolls_back_every_v2_write(self):
        self.create_legacy_fixture()
        output = StringIO()

        call_command("migrate_legacy_v2", stdout=output)

        self.assertEqual(Tenant.objects.filter(slug="legacy-shop").count(), 0)
        self.assertEqual(Site.objects.count(), 0)
        self.assertEqual(SiteVersion.objects.count(), 0)
        self.assertEqual(Domain.objects.filter(hostname="legacy.example.com").count(), 0)
        self.assertIn("Dry-run complete", output.getvalue())

    def test_apply_is_idempotent_and_custom_domain_requires_new_proof(self):
        _, legacy_site = self.create_legacy_fixture()

        call_command("migrate_legacy_v2", apply=True, stdout=StringIO())
        call_command("migrate_legacy_v2", apply=True, stdout=StringIO())

        tenant = Tenant.objects.get(slug="legacy-shop")
        site = Site.objects.get(tenant=tenant, slug="main")
        self.assertEqual(SiteVersion.objects.filter(site=site).count(), 1)
        self.assertEqual(site.published_version_id, site.draft_version_id)
        marker = site.draft_version.seo["_migration"]
        self.assertEqual(marker["source"], "legacy_core")
        self.assertEqual(marker["legacy_site_id"], str(legacy_site.pk))

        domain = Domain.objects.get(hostname="legacy.example.com")
        self.assertEqual(domain.tenant_id, tenant.id)
        self.assertEqual(domain.site_id, site.id)
        self.assertEqual(domain.kind, Domain.Kind.CUSTOM)
        self.assertEqual(domain.status, Domain.Status.PENDING)
        self.assertIsNone(domain.verified_at)

        call_command("check_legacy_parity", stdout=StringIO(), stderr=StringIO())

    def test_clean_rerun_preserves_new_v2_domain_verification(self):
        self.create_legacy_fixture()
        call_command("migrate_legacy_v2", apply=True, stdout=StringIO())

        domain = Domain.objects.get(hostname="legacy.example.com")
        domain.status = Domain.Status.VERIFIED
        domain.verified_at = timezone.now()
        verified_at = domain.verified_at
        domain.save(update_fields=["status", "verified_at", "updated_at"])

        call_command("migrate_legacy_v2", apply=True, stdout=StringIO())

        domain.refresh_from_db()
        self.assertEqual(domain.status, Domain.Status.VERIFIED)
        self.assertEqual(domain.verified_at, verified_at)
        call_command("check_legacy_parity", stdout=StringIO(), stderr=StringIO())

    def test_rerun_refuses_to_repoint_site_after_native_v2_version_exists(self):
        self.create_legacy_fixture()
        call_command("migrate_legacy_v2", apply=True, stdout=StringIO())

        site = Site.objects.get(tenant__slug="legacy-shop", slug="main")
        native = SiteVersion.objects.create(
            site=site,
            version=2,
            title="Native V2 draft",
            blocks=[],
            seo={},
        )
        site.draft_version = native
        site.save(update_fields=["draft_version", "updated_at"])

        with self.assertRaises(CommandError):
            call_command("migrate_legacy_v2", apply=True, stdout=StringIO())

        site.refresh_from_db()
        self.assertEqual(site.draft_version_id, native.id)

    def test_import_refuses_to_overwrite_existing_v2_content(self):
        self.create_legacy_fixture(slug="collision")
        tenant = Tenant.objects.create(
            name="Already V2",
            slug="collision",
            status=Tenant.Status.ACTIVE,
            plan=Tenant.Plan.BUSINESS,
        )
        site = Site.objects.create(tenant=tenant, slug="main", name="Already live")
        SiteVersion.objects.create(
            site=site,
            version=1,
            title="Native V2 content",
            blocks=[],
            seo={},
        )

        with self.assertRaises(CommandError):
            call_command("migrate_legacy_v2", apply=True, stdout=StringIO())

        tenant.refresh_from_db()
        self.assertEqual(tenant.name, "Already V2")
        self.assertEqual(tenant.plan, Tenant.Plan.BUSINESS)
        self.assertEqual(SiteVersion.objects.get(site=site, version=1).title, "Native V2 content")

    def test_domain_collision_across_tenants_fails_closed(self):
        self.create_legacy_fixture(slug="legacy-domain-owner")
        other = Tenant.objects.create(
            name="Other V2",
            slug="other-v2",
            status=Tenant.Status.ACTIVE,
            plan=Tenant.Plan.PRO,
        )
        Domain.objects.create(
            tenant=other,
            hostname="legacy.example.com",
            kind=Domain.Kind.CUSTOM,
            status=Domain.Status.VERIFIED,
            verified_at=timezone.now(),
        )

        with self.assertRaises(CommandError):
            call_command("migrate_legacy_v2", apply=True, stdout=StringIO())

        self.assertEqual(Domain.objects.get(hostname="legacy.example.com").tenant_id, other.id)
