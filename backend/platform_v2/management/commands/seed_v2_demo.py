from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from platform_v2.models import QRCode, Site, SiteVersion, Tenant


DEMOS = [
    {
        "tenant": "lola-flowers",
        "name": "Lola Flowers",
        "plan": Tenant.Plan.FREE,
        "template": "oddiy",
        "primary": "#0f766e",
        "accent": "#f59e0b",
        "description": "Gullar va sovg‘alar uchun tez QR vizitka.",
    },
    {
        "tenant": "sabina-beauty",
        "name": "Sabina Beauty",
        "plan": Tenant.Plan.STARTER,
        "template": "plus",
        "primary": "#7c3aed",
        "accent": "#db2777",
        "description": "Beauty xizmatlari, portfolio va yozilish sahifasi.",
    },
    {
        "tenant": "gulasal-atelier",
        "name": "Gulasal Atelier",
        "plan": Tenant.Plan.PRO,
        "template": "pro",
        "primary": "#111827",
        "accent": "#b08d57",
        "description": "Premium atelier uchun digital business presence.",
    },
]


def blocks(item):
    return [
        {"id":"hero","type":"hero","enabled":True,"data":{"businessName":item["name"],"category":"Business","description":item["description"]}},
        {"id":"contacts","type":"contact_buttons","enabled":True,"data":{"phone":"+998 90 123 45 67","telegram":"https://t.me/example","instagram":"https://instagram.com/example"}},
        {"id":"services","type":"services","enabled":True,"data":{"title":"Xizmatlar","items":[{"id":"service-1","name":"Asosiy xizmat","description":"Professional xizmat","price":"Kelishiladi"}]}},
        {"id":"hours","type":"working_hours","enabled":True,"data":{"title":"Ish vaqti","rows":[{"day":"Dushanba - Shanba","value":"09:00 - 19:00"}]}},
        {"id":"location","type":"location","enabled":True,"data":{"title":"Manzil","address":"Toshkent shahri","mapUrl":"https://maps.google.com"}},
    ]


class Command(BaseCommand):
    help = "Create deterministic V2-only demo tenants/sites. Never touches legacy core tables."

    @transaction.atomic
    def handle(self, *args, **options):
        for item in DEMOS:
            tenant, _ = Tenant.objects.update_or_create(
                slug=item["tenant"],
                defaults={"name":item["name"],"status":Tenant.Status.ACTIVE,"plan":item["plan"],"locale":"uz","timezone":"Asia/Tashkent"},
            )
            site, _ = Site.objects.update_or_create(tenant=tenant, slug="main", defaults={"name":item["name"],"status":Site.Status.DRAFT})
            version, _ = SiteVersion.objects.update_or_create(
                site=site,
                version=1,
                defaults={
                    "title":item["name"],"description":item["description"],"template_key":item["template"],
                    "theme":{"primaryColor":item["primary"],"accentColor":item["accent"],"backgroundColor":"#f8fafc","textColor":"#111827","surfaceColor":"#ffffff"},
                    "blocks":blocks(item),"seo":{"title":item["name"],"description":item["description"]},"created_by":None,
                },
            )
            site.draft_version=version
            site.published_version=version
            site.status=Site.Status.PUBLISHED
            site.published_at=site.published_at or timezone.now()
            site.save(update_fields=["draft_version","published_version","status","published_at","updated_at"])
            QRCode.objects.get_or_create(tenant=tenant,site=site,defaults={"label":item["name"],"campaign":"demo"})
            self.stdout.write(self.style.SUCCESS(f"seeded {tenant.slug}/main"))
