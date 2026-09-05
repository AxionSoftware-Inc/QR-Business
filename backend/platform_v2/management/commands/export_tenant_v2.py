import hashlib
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.core.serializers.json import DjangoJSONEncoder
from django.core.files.storage import default_storage

from platform_v2.analytics import tenant_analytics
from platform_v2.models import Domain, MediaAsset, QRCode, Site, Tenant


class Command(BaseCommand):
    help = "Export one tenant's business data without auth/session secrets."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", required=True, help="Tenant UUID or exact slug.")
        parser.add_argument("--output", required=True, help="Destination JSON file path.")
        parser.add_argument("--overwrite", action="store_true", help="Allow replacing an existing output file.")

    def handle(self, *args, **options):
        selector = str(options["tenant"]).strip()
        output = Path(options["output"]).expanduser().resolve()
        if output.exists() and not options["overwrite"]:
            raise CommandError(f"Output already exists: {output}. Use --overwrite to replace it.")

        tenant = Tenant.objects.filter(id=selector).first() if _looks_like_uuid(selector) else None
        if not tenant:
            tenant = Tenant.objects.filter(slug=selector).first()
        if not tenant:
            raise CommandError("Tenant not found.")

        sites = Site.objects.filter(tenant=tenant).prefetch_related("versions").order_by("created_at", "id")
        payload = {
            "schema": "qr-business-v2-tenant-export/1",
            "tenant": {
                "id": str(tenant.id),
                "name": tenant.name,
                "slug": tenant.slug,
                "status": tenant.status,
                "plan": tenant.plan,
                "locale": tenant.locale,
                "timezone": tenant.timezone,
                "created_at": tenant.created_at,
                "updated_at": tenant.updated_at,
            },
            "sites": [
                {
                    "id": str(site.id),
                    "slug": site.slug,
                    "name": site.name,
                    "status": site.status,
                    "draft_version_id": str(site.draft_version_id) if site.draft_version_id else None,
                    "published_version_id": str(site.published_version_id) if site.published_version_id else None,
                    "published_at": site.published_at,
                    "versions": [
                        {
                            "id": str(version.id),
                            "version": version.version,
                            "title": version.title,
                            "description": version.description,
                            "template_key": version.template_key,
                            "theme": version.theme,
                            "blocks": version.blocks,
                            "seo": version.seo,
                            "created_at": version.created_at,
                        }
                        for version in site.versions.all().order_by("version")
                    ],
                }
                for site in sites
            ],
            "domains": [
                {
                    "id": str(domain.id),
                    "site_id": str(domain.site_id) if domain.site_id else None,
                    "hostname": domain.hostname,
                    "kind": domain.kind,
                    "status": domain.status,
                    "verified_at": domain.verified_at,
                    "created_at": domain.created_at,
                }
                for domain in Domain.objects.filter(tenant=tenant).order_by("created_at", "id")
            ],
            "qr_codes": [
                {
                    "id": str(qr.id),
                    "site_id": str(qr.site_id),
                    "code": qr.code,
                    "label": qr.label,
                    "campaign": qr.campaign,
                    "is_active": qr.is_active,
                    "created_at": qr.created_at,
                }
                for qr in QRCode.objects.filter(tenant=tenant).order_by("created_at", "id")
            ],
            "media": [
                {
                    "id": str(asset.id),
                    "kind": asset.kind,
                    "url": default_storage.url(asset.storage_key),
                    "original_name": asset.original_name,
                    "content_type": asset.content_type,
                    "byte_size": asset.byte_size,
                    "width": asset.width,
                    "height": asset.height,
                    "sha256": asset.sha256,
                    "alt": asset.alt,
                    "created_at": asset.created_at,
                }
                for asset in MediaAsset.objects.filter(tenant=tenant).order_by("created_at", "id")
            ],
            "analytics": tenant_analytics(tenant, advanced=True, daily_days=3650),
            "excluded_sensitive_classes": ["auth_sessions", "identity_provider_subjects", "verification_tokens", "billing_secrets"],
        }

        output.parent.mkdir(parents=True, exist_ok=True)
        encoded = json.dumps(payload, cls=DjangoJSONEncoder, ensure_ascii=False, sort_keys=True, indent=2).encode("utf-8")
        output.write_bytes(encoded)
        digest = hashlib.sha256(encoded).hexdigest()
        manifest = output.with_suffix(output.suffix + ".sha256")
        manifest.write_text(f"{digest}  {output.name}\n", encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Exported {tenant.slug} to {output}"))
        self.stdout.write(f"sha256={digest}")


def _looks_like_uuid(value):
    import uuid
    try:
        uuid.UUID(value)
        return True
    except (ValueError, AttributeError, TypeError):
        return False
