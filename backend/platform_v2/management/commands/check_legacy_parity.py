from django.core.management.base import BaseCommand, CommandError

from core.models import Domain as LegacyDomain
from core.models import Site as LegacySite
from core.models import Tenant as LegacyTenant
from platform_v2.models import Domain, Site, Tenant


MIGRATION_SOURCE = "legacy_core"


def is_imported_version(version, legacy_site):
    if version is None:
        return False
    seo = version.seo if isinstance(version.seo, dict) else {}
    marker = seo.get("_migration") if isinstance(seo.get("_migration"), dict) else {}
    return marker.get("source") == MIGRATION_SOURCE and marker.get("legacy_site_id") == str(legacy_site.pk)


class Command(BaseCommand):
    help = "Fail unless every migratable legacy tenant/site/domain has an exact V2 counterpart. Read-only."

    def handle(self, *args, **options):
        failures = []
        checked = {"tenants": 0, "sites": 0, "domains": 0}

        for legacy_tenant in LegacyTenant.objects.all().iterator():
            checked["tenants"] += 1
            tenant = Tenant.objects.filter(slug=legacy_tenant.slug).first()
            if not tenant:
                failures.append(f"missing-tenant:{legacy_tenant.slug}")
                continue

            legacy_site = LegacySite.objects.filter(tenant=legacy_tenant).first()
            if legacy_site:
                checked["sites"] += 1
                site = Site.objects.select_related("draft_version", "published_version").filter(
                    tenant=tenant,
                    slug="main",
                ).first()
                if not site:
                    failures.append(f"missing-site:{legacy_tenant.slug}/main")
                else:
                    imported = site.draft_version
                    if not is_imported_version(imported, legacy_site):
                        failures.append(f"wrong-import-provenance:{legacy_tenant.slug}/main")
                    else:
                        expected_theme = legacy_site.theme if isinstance(legacy_site.theme, dict) else {}
                        expected_blocks = legacy_site.blocks if isinstance(legacy_site.blocks, list) else []
                        if imported.title != legacy_site.title:
                            failures.append(f"title-mismatch:{legacy_tenant.slug}/main")
                        if imported.description != legacy_site.description:
                            failures.append(f"description-mismatch:{legacy_tenant.slug}/main")
                        if imported.template_key != legacy_site.template_key:
                            failures.append(f"template-mismatch:{legacy_tenant.slug}/main")
                        if imported.theme != expected_theme:
                            failures.append(f"theme-mismatch:{legacy_tenant.slug}/main")
                        if imported.blocks != expected_blocks:
                            failures.append(f"blocks-mismatch:{legacy_tenant.slug}/main")

                    if legacy_site.status == LegacySite.Status.PUBLISHED:
                        if site.status != Site.Status.PUBLISHED or site.published_version_id != site.draft_version_id:
                            failures.append(f"published-site-mismatch:{legacy_tenant.slug}/main")
                    elif legacy_site.status == LegacySite.Status.DISABLED:
                        if site.status != Site.Status.DISABLED or site.published_version_id is not None:
                            failures.append(f"disabled-site-mismatch:{legacy_tenant.slug}/main")
                    else:
                        if site.status != Site.Status.DRAFT or site.published_version_id is not None:
                            failures.append(f"draft-site-mismatch:{legacy_tenant.slug}/main")

            for legacy_domain in LegacyDomain.objects.filter(tenant=legacy_tenant):
                hostname = legacy_domain.hostname.strip().lower().rstrip(".")
                if not hostname or "/" in hostname:
                    continue
                checked["domains"] += 1
                domain = Domain.objects.filter(hostname=hostname, tenant=tenant).first()
                if not domain:
                    failures.append(f"missing-domain:{hostname}")
                    continue
                if legacy_site and domain.site_id:
                    main_site_id = Site.objects.filter(tenant=tenant, slug="main").values_list("id", flat=True).first()
                    if domain.site_id != main_site_id:
                        failures.append(f"domain-site-mismatch:{hostname}")
                if legacy_domain.type == LegacyDomain.Type.CUSTOM:
                    # V2 deliberately does not inherit the legacy verification trust bit.
                    # A custom domain must remain pending until the new TXT proof succeeds.
                    if domain.kind != Domain.Kind.CUSTOM or domain.status != Domain.Status.PENDING or domain.verified_at is not None:
                        failures.append(f"custom-domain-reverification-mismatch:{hostname}")

        self.stdout.write(
            f"checked tenants={checked['tenants']} sites={checked['sites']} domains={checked['domains']}"
        )
        if failures:
            for item in failures[:100]:
                self.stderr.write(f"PARITY_FAIL {item}")
            raise CommandError(f"Legacy parity FAILED: {len(failures)} mismatches.")
        self.stdout.write(self.style.SUCCESS("Legacy parity PASS: every migratable runtime object matches the V2 import contract."))
