from django.core.management.base import BaseCommand
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


class DryRunRollback(Exception):
    pass


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
            "tenants": 0,
            "sites": 0,
            "versions": 0,
            "domains": 0,
            "owner_links_required": 0,
        }

        try:
            with transaction.atomic():
                for legacy_tenant in LegacyTenant.objects.all().iterator():
                    tenant, _ = Tenant.objects.update_or_create(
                        slug=legacy_tenant.slug,
                        defaults={
                            "name": legacy_tenant.name,
                            "status": STATUS_MAP.get(legacy_tenant.status, Tenant.Status.TRIAL),
                            "plan": PLAN_MAP.get(legacy_tenant.plan, Tenant.Plan.FREE),
                            "locale": "uz",
                            "timezone": "Asia/Tashkent",
                        },
                    )
                    counters["tenants"] += 1
                    if legacy_tenant.owner_contact:
                        # Legacy owner_contact was not a verified identity. Never auto-link
                        # it to a real account; require a verified sign-in/account claim.
                        counters["owner_links_required"] += 1

                    legacy_site = LegacySite.objects.filter(tenant=legacy_tenant).first()
                    if not legacy_site:
                        continue

                    site, _ = Site.objects.update_or_create(
                        tenant=tenant,
                        slug="main",
                        defaults={
                            "name": legacy_site.title,
                            "status": Site.Status.DRAFT,
                        },
                    )
                    counters["sites"] += 1

                    # Idempotent migration: use version 1 as the imported snapshot.
                    version, created = SiteVersion.objects.update_or_create(
                        site=site,
                        version=1,
                        defaults={
                            "title": legacy_site.title,
                            "description": legacy_site.description,
                            "template_key": legacy_site.template_key,
                            "theme": legacy_site.theme if isinstance(legacy_site.theme, dict) else {},
                            "blocks": legacy_site.blocks if isinstance(legacy_site.blocks, list) else [],
                            "seo": {},
                            "created_by": None,
                        },
                    )
                    if created:
                        counters["versions"] += 1

                    site.draft_version = version
                    if legacy_site.status == LegacySite.Status.PUBLISHED:
                        site.published_version = version
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
                        Domain.objects.update_or_create(
                            hostname=hostname,
                            defaults={
                                "tenant": tenant,
                                "site": site,
                                "kind": (
                                    Domain.Kind.CUSTOM
                                    if legacy_domain.type == LegacyDomain.Type.CUSTOM
                                    else Domain.Kind.SUBDOMAIN
                                ),
                                "status": (
                                    Domain.Status.VERIFIED
                                    if legacy_domain.status == LegacyDomain.Status.VERIFIED
                                    else Domain.Status.PENDING
                                ),
                                "verified_at": legacy_domain.verified_at,
                            },
                        )
                        counters["domains"] += 1

                self.stdout.write(self.style.SUCCESS(self._report(counters, apply_changes)))
                if not apply_changes:
                    raise DryRunRollback()
        except DryRunRollback:
            self.stdout.write(self.style.WARNING("Dry-run complete: all database changes rolled back."))

    def _report(self, counters, applied):
        mode = "APPLY" if applied else "DRY-RUN"
        return (
            f"[{mode}] tenants={counters['tenants']} sites={counters['sites']} "
            f"versions_created={counters['versions']} domains={counters['domains']} "
            f"owner_links_required={counters['owner_links_required']}"
        )
