from django.core.management.base import BaseCommand
from django.utils import timezone
from pathlib import Path
import json

from core.models import Domain, Site, Tenant


class Command(BaseCommand):
    help = "Seed demo tenants and sites for local development."

    def handle(self, *args, **options):
        data_path = Path(__file__).resolve().parents[2] / "demo_data.json"
        data = json.loads(data_path.read_text(encoding="utf-8"))
        sites_by_tenant_id = {
            site["tenantId"]: site for site in data["publishedSites"]
        }
        domains_by_tenant_id = {
            domain["tenantId"]: domain for domain in data["domains"]
        }
        demos = []

        for tenant_data in data["tenants"]:
            site_data = sites_by_tenant_id[tenant_data["id"]]
            domain_data = domains_by_tenant_id[tenant_data["id"]]
            demos.append(
                {
                    "tenant": {
                        "name": tenant_data["name"],
                        "slug": tenant_data["slug"],
                        "plan": tenant_data["plan"],
                    },
                    "domain": domain_data["hostname"],
                    "site": {
                        "title": site_data["title"],
                        "description": site_data["description"],
                        "template_key": site_data["templateKey"],
                        "theme": site_data["theme"],
                        "blocks": site_data["blocks"],
                    },
                }
            )

        for demo in demos:
            tenant, _ = Tenant.objects.update_or_create(
                slug=demo["tenant"]["slug"],
                defaults={
                    **demo["tenant"],
                    "status": Tenant.Status.ACTIVE,
                },
            )
            Domain.objects.update_or_create(
                hostname=demo["domain"],
                defaults={
                    "tenant": tenant,
                    "type": Domain.Type.SUBDOMAIN,
                    "status": Domain.Status.VERIFIED,
                    "verified_at": timezone.now(),
                },
            )
            Site.objects.update_or_create(
                tenant=tenant,
                defaults={
                    **demo["site"],
                    "status": Site.Status.PUBLISHED,
                    "published_at": timezone.now(),
                },
            )

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))
