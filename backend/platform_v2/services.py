import hashlib
from urllib.parse import urlparse

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import AnalyticsEvent, AuditLog, Site, SiteVersion


MAX_BLOCKS = 64
MAX_METADATA_KEYS = 32


class SitePayloadError(ValueError):
    pass


def validate_site_payload(payload):
    if not isinstance(payload, dict):
        raise SitePayloadError("Site payload must be an object.")

    blocks = payload.get("blocks", [])
    if not isinstance(blocks, list):
        raise SitePayloadError("blocks must be an array.")
    if len(blocks) > MAX_BLOCKS:
        raise SitePayloadError(f"A site may contain at most {MAX_BLOCKS} blocks.")

    seen_ids = set()
    clean_blocks = []
    for block in blocks:
        if not isinstance(block, dict):
            raise SitePayloadError("Each block must be an object.")
        block_id = str(block.get("id") or "").strip()
        block_type = str(block.get("type") or "").strip()
        if not block_id or not block_type:
            raise SitePayloadError("Each block requires id and type.")
        if block_id in seen_ids:
            raise SitePayloadError(f"Duplicate block id: {block_id}")
        seen_ids.add(block_id)
        clean_blocks.append(block)

    return {
        "title": str(payload.get("title") or "Untitled site").strip()[:180],
        "description": str(payload.get("description") or "").strip(),
        "template_key": str(payload.get("template_key") or payload.get("templateKey") or "default").strip()[:64],
        "theme": payload.get("theme") if isinstance(payload.get("theme"), dict) else {},
        "blocks": clean_blocks,
        "seo": payload.get("seo") if isinstance(payload.get("seo"), dict) else {},
    }


def next_version_number(site):
    latest = site.versions.order_by("-version").values_list("version", flat=True).first()
    return (latest or 0) + 1


@transaction.atomic
def save_draft(*, site, payload, actor):
    site = Site.objects.select_for_update().get(pk=site.pk)
    clean = validate_site_payload(payload)
    version = SiteVersion.objects.create(site=site, version=next_version_number(site), created_by=actor, **clean)
    site.draft_version = version
    if not site.published_version:
        site.status = Site.Status.DRAFT
    site.save(update_fields=["draft_version", "status", "updated_at"])
    AuditLog.objects.create(tenant=site.tenant, actor=actor, action="site.draft_saved", object_type="site", object_id=str(site.pk), metadata={"version": version.version})
    return version


@transaction.atomic
def publish_site(*, site, actor):
    site = Site.objects.select_for_update().select_related("draft_version").get(pk=site.pk)
    if not site.draft_version:
        raise SitePayloadError("Create a draft before publishing.")

    source = site.draft_version
    published = SiteVersion.objects.create(
        site=site,
        version=next_version_number(site),
        title=source.title,
        description=source.description,
        template_key=source.template_key,
        theme=source.theme,
        blocks=source.blocks,
        seo=source.seo,
        created_by=actor,
    )
    site.published_version = published
    site.status = Site.Status.PUBLISHED
    site.published_at = timezone.now()
    site.save(update_fields=["published_version", "status", "published_at", "updated_at"])
    AuditLog.objects.create(tenant=site.tenant, actor=actor, action="site.published", object_type="site", object_id=str(site.pk), metadata={"version": published.version})
    return published


def analytics_client_ip(request):
    """Use proxy headers only when the deployment explicitly trusts its edge proxy.

    A directly reachable application must not let arbitrary clients mint distinct
    analytics identities by spoofing X-Forwarded-For.
    """
    trust_forwarded = bool(getattr(settings, "ANALYTICS_TRUST_X_FORWARDED_FOR", False))
    if trust_forwarded:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if forwarded:
            return forwarded.split(",")[0].strip()[:64]
    return str(request.META.get("REMOTE_ADDR", "") or "")[:64]


def visitor_hash(request):
    ip = analytics_client_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "")[:512]
    salt = getattr(settings, "ANALYTICS_HASH_SALT", settings.SECRET_KEY)
    day = timezone.now().strftime("%Y-%m-%d")
    raw = f"{salt}|{day}|{ip}|{user_agent}".encode("utf-8", errors="ignore")
    return hashlib.sha256(raw).hexdigest()


def referrer_domain(request):
    value = request.META.get("HTTP_REFERER", "")
    if not value:
        return ""
    try:
        return (urlparse(value).hostname or "")[:253]
    except ValueError:
        return ""


def sanitize_metadata(value):
    if not isinstance(value, dict):
        return {}
    clean = {}
    for key, item in list(value.items())[:MAX_METADATA_KEYS]:
        key = str(key)[:64]
        if isinstance(item, (str, int, float, bool)) or item is None:
            clean[key] = item if not isinstance(item, str) else item[:500]
    return clean


def record_event(*, request, site, event_type, target="", qr_code=None, metadata=None):
    return AnalyticsEvent.objects.create(
        tenant=site.tenant,
        site=site,
        qr_code=qr_code,
        event_type=event_type,
        target=str(target or "")[:80],
        visitor_hash=visitor_hash(request),
        referrer_domain=referrer_domain(request),
        metadata=sanitize_metadata(metadata),
    )
