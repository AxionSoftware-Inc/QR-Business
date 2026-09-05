from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import Domain as LegacyDomain
from core.models import Site as LegacySite
from core.models import Tenant as LegacyTenant
from platform_v2.models import Domain, Site, SiteVersion, Tenant


PLAN_MAP = {
    "oddiy": Tenant.Plan.FREE,
    "plus": Tenant.Plan.STARTER,
    "pro": Tenant.Plan.PRO,
}
STATUS_MAP = {
    "draft": Tenant.Status.TRIAL,
    "active": Tenant.Status.ACTIVE,
    "blocked": Tenant.Status.SUSPENDED,
    "archived": Tenant.Status.ARCHIVED,
}
MIGRATION_SOURCE = "legacy_core"


class DryRunRollback(Exception):
    pass


def migration_marker(legacy_site):
    return {
        "source": MIGRATION_SOURCE,
        "legacy_site_id": str(legacy_site.pk),
    }


def is_same_import(version, legacy_site):
    seo = version.seo if isinstance(version.seo, dict) else {}
    marker = seo.get("_migration") if isinstance(seo.get("_migration"), dict) else {}
    return marker.get("source") == MIGRATION_SOURCE and marker.get("legacy_site_id") == str(legacy_site.pk)


class Command(BaseCommand):
    help = "Migrate legacy public tenant/site/domain data into platform_v2. Dry-run by default."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Commit changes. Without this flag the command always rolls back.",
        )

    def handle(self, *args, **options):
        apply_changes = bool(options["apply"])
        counters = {
            "tenants_created": 0,
            "tenants_existing": 0,
            "sites_created": 0,
            "sites_existing": 0,
            "versions_created": 0,
            "versions_reused": 0,
            "domains_created": 0,
            "domains_existing": 0,
            "custom_domains_reverify": 0,
            "owner_links_required": 0,
        }

        try:
            with transaction.atomic():
                for legacy_tenant in LegacyTenant.objects.all().iterator():
                    tenant = Tenant.objects.filter(slug=legacy_tenant.slug).first()
                    if tenant is None:
                        tenant = Tenant.objects.create(
                            slug=legacy_tenant.slug,
                            name=legacy_tenant.name,
                            status=STATUS_MAP.get(legacy_tenant.status, Tenant.Status.TRIAL),
                            plan=PLAN_MAP.get(legacy_tenant.plan, Tenant.Plan.FREE),
                            locale="uz",
                            timezone="Asia/Tashkent",
                        )
                        counters["tenants_created"] += 1
                    else:
                        # Existing V2 tenant state is canonical. Never silently downgrade,
                        # rename or otherwise overwrite a tenant that may already be live.
                        counters["tenants_existing"] += 1

                    if legacy_tenant.owner_contact:
                        # Legacy owner_contact was not a verified identity. Never auto-link
                        # it to a real account; require a verified sign-in/account claim.
                        counters["owner_links_required"] += 1

                    legacy_site = LegacySite.objects.filter(tenant=legacy_tenant).first()
                    if not legacy_site:
                        continue

                    site = Site.objects.filter(tenant=tenant, slug="main").first()
                    if site is None:
                        site = Site.objects.create(
                            tenant=tenant,
                            slug="main",
                            name=legacy_site.title,
                            status=Site.Status.DRAFT,
                        )
                        counters["sites_created"] += 1
                    else:
                        counters["sites_existing"] += 1

                    versions = list(SiteVersion.objects.filter(site=site).order_by("version"))
                    imported_version = next(
                        (candidate for candidate in versions if is_same_import(candidate, legacy_site)),
                        None,
                    )
                    non_import_versions = [
                        candidate for candidate in versions if not is_same_import(candidate, legacy_site)
                    ]

                    if imported_version is not None and non_import_versions:
                        raise CommandError(
                            f"Post-import V2 content exists for tenant={tenant.slug} site=main. "
                            "The importer will not move draft/published pointers back to legacy content."
                        )

                    first_import = imported_version is None
                    if first_import:
                        if versions:
                            raise CommandError(
                                f"Migration collision for tenant={tenant.slug} site=main: "
                                "the V2 site already has non-legacy versions. Resolve manually; "
                                "the importer will not overwrite live V2 content."
                            )
                        imported_version = SiteVersion.objects.create(
                            site=site,
                            version=1,
                            title=legacy_site.title,
                            description=legacy_site.description,
                            template_key=legacy_site.template_key,
                            theme=legacy_site.theme if isinstance(legacy_site.theme, dict) else {},
                            blocks=legacy_site.blocks if isinstance(legacy_site.blocks, list) else [],
                            seo={"_migration": migration_marker(legacy_site)},
                            created_by=None,
                        )
                        counters["versions_created"] += 1
                    else:
                        # A clean rerun may reuse the exact imported snapshot. It is only
                        # considered clean when no later native V2 version exists.
                        counters["versions_reused"] += 1

                    site.draft_version = imported_version
                    if legacy_site.status == LegacySite.Status.PUBLISHED:
                        site.published_version = imported_version
                        site.status = Site.Status.PUBLISHED
                        site.published_at = legacy_site.published_at
                    elif legacy_site.status == LegacySite.Status.DISABLED:
                        site.published_version = None
                        site.status = Site.Status.DISABLED
                        site.published_at = None
                    else:
                        site.published_version = None
                        site.status = Site.Status.DRAFT
                        site.published_at = None
                    site.save(
                        update_fields=[
                            "draft_version",
                            "published_version",
                            "status",
                            "published_at",
                            "updated_at",
                        ]
                    )

                    for legacy_domain in LegacyDomain.objects.filter(tenant=legacy_tenant):
                        hostname = legacy_domain.hostname.strip().lower().rstrip(".")
                        # The legacy code sometimes stored a path (host/slug) in this
                        # column. Such rows are routing artifacts, not DNS hostnames.
                        if not hostname or "/" in hostname:
                            continue

                        existing_domain = Domain.objects.filter(hostname=hostname).first()
                        if existing_domain and existing_domain.tenant_id != tenant.id:
                            raise CommandError(
                                f"Domain collision for {hostname}: already belongs to another V2 tenant."
                            )

                        kind = (
                            Domain.Kind.CUSTOM
                            if legacy_domain.type == LegacyDomain.Type.CUSTOM
                            else Domain.Kind.SUBDOMAIN
                        )
                        if kind == Domain.Kind.CUSTOM:
                            # Legacy verification did not use the V2 TXT proof. On first
                            # import the trust bit never crosses the security boundary.
                            domain_status = Domain.Status.PENDING
                            verified_at = None
                        else:
                            domain_status = (
                                Domain.Status.VERIFIED
                                if legacy_domain.status == LegacyDomain.Status.VERIFIED
                                else Domain.Status.PENDING
                            )
                            verified_at = legacy_domain.verified_at if domain_status == Domain.Status.VERIFIED else None

                        if existing_domain is None:
                            Domain.objects.create(
                                hostname=hostname,
                                tenant=tenant,
                                site=site,
                                kind=kind,
                                status=domain_status,
                                verified_at=verified_at,
                            )
                            counters["domains_created"] += 1
                            if kind == Domain.Kind.CUSTOM:
                                counters["custom_domains_reverify"] += 1
                        else:
                            if existing_domain.site_id not in {None, site.id}:
                                raise CommandError(
                                    f"Domain collision for {hostname}: mapped to a different V2 site."
                                )
                            if existing_domain.kind != kind:
                                raise CommandError(
                                    f"Domain collision for {hostname}: V2 kind does not match legacy kind."
                                )
                            if first_import:
                                # A same-host domain that existed before the imported snapshot
                                # has no migration provenance. Do not mutate or reassign it.
                                raise CommandError(
                                    f"Domain collision for {hostname}: a V2 domain existed before this legacy import."
                                )
                            # Clean reruns preserve V2 domain state. In particular, a custom
                            # domain that has since passed the new TXT proof must remain verified.
                            counters["domains_existing"] += 1

                self.stdout.write(self.style.SUCCESS(self._report(counters, apply_changes)))
                if not apply_changes:
                    raise DryRunRollback()
        except DryRunRollback:
            self.stdout.write(self.style.WARNING("Dry-run complete: all database changes rolled back."))

    def _report(self, counters, applied):
        mode = "APPLY" if applied else "DRY-RUN"
        return (
            f"[{mode}] tenants_created={counters['tenants_created']} "
            f"tenants_existing={counters['tenants_existing']} "
            f"sites_created={counters['sites_created']} sites_existing={counters['sites_existing']} "
            f"versions_created={counters['versions_created']} versions_reused={counters['versions_reused']} "
            f"domains_created={counters['domains_created']} domains_existing={counters['domains_existing']} "
            f"custom_domains_reverify={counters['custom_domains_reverify']} "
            f"owner_links_required={counters['owner_links_required']}"
        )
