from django.core.management.base import BaseCommand, CommandError

from core.models import Domain as LegacyDomain
from core.models import Site as LegacySite
from core.models import Tenant as LegacyTenant
from platform_v2.models import Domain, Site, Tenant


class Command(BaseCommand):
    help = "Fail unless every migratable legacy tenant/site/domain has a V2 counterpart. Read-only."

    def handle(self, *args, **options):
        missing = []
        checked = {"tenants": 0, "sites": 0, "domains": 0}

        for legacy_tenant in LegacyTenant.objects.all().iterator():
            checked["tenants"] += 1
            tenant = Tenant.objects.filter(slug=legacy_tenant.slug).first()
            if not tenant:
                missing.append(f"tenant:{legacy_tenant.slug}")
                continue

            legacy_site = LegacySite.objects.filter(tenant=legacy_tenant).first()
            if legacy_site:
                checked["sites"] += 1
                site = Site.objects.filter(tenant=tenant).order_by("created_at").first()
                if not site:
                    missing.append(f"site:{legacy_tenant.slug}")
                elif legacy_site.status == LegacySite.Status.PUBLISHED and (
                    site.status != Site.Status.PUBLISHED or site.published_version_id is None
                ):
                    missing.append(f"published-site:{legacy_tenant.slug}")

            for legacy_domain in LegacyDomain.objects.filter(tenant=legacy_tenant):
                hostname = legacy_domain.hostname.strip().lower().rstrip(".")
                if not hostname or "/" in hostname:
                    continue
                checked["domains"] += 1
                if not Domain.objects.filter(hostname=hostname, tenant=tenant).exists():
                    missing.append(f"domain:{hostname}")

        self.stdout.write(
            f"checked tenants={checked['tenants']} sites={checked['sites']} domains={checked['domains']}"
        )
        if missing:
            for item in missing[:100]:
                self.stderr.write(f"MISSING {item}")
            raise CommandError(f"Legacy parity FAILED: {len(missing)} missing V2 objects.")
        self.stdout.write(self.style.SUCCESS("Legacy parity PASS: V2 contains every migratable runtime object."))
