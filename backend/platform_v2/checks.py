from urllib.parse import urlparse

from django.conf import settings
from django.core.checks import Error, Warning, register


@register(deploy=True)
def platform_v2_deployment_checks(app_configs, **kwargs):
    if settings.DEBUG:
        return []

    issues = []
    if not getattr(settings, "REDIS_URL", ""):
        issues.append(Error(
            "Production requires a shared Redis cache so throttles/cache state are consistent across instances.",
            hint="Set REDIS_URL to the production Redis endpoint.",
            id="platform_v2.E001",
        ))
    if not getattr(settings, "S3_BUCKET_NAME", ""):
        issues.append(Error(
            "Production media storage is not configured.",
            hint="Set S3_BUCKET_NAME and the matching S3-compatible storage settings.",
            id="platform_v2.E002",
        ))

    public_url = str(getattr(settings, "PUBLIC_WEB_BASE_URL", "") or "")
    if urlparse(public_url).scheme != "https":
        issues.append(Error(
            "PUBLIC_WEB_BASE_URL must use HTTPS in production.",
            hint="Set PUBLIC_WEB_BASE_URL=https://your-public-domain.",
            id="platform_v2.E003",
        ))

    if getattr(settings, "ANALYTICS_HASH_SALT", None) == settings.SECRET_KEY:
        issues.append(Error(
            "ANALYTICS_HASH_SALT must be independent from DJANGO_SECRET_KEY in production.",
            hint="Set ANALYTICS_HASH_SALT to a separate random secret.",
            id="platform_v2.E004",
        ))

    if not getattr(settings, "SENTRY_DSN", ""):
        issues.append(Warning(
            "No external error-reporting DSN is configured.",
            hint="Set SENTRY_DSN (or explicitly accept console-only observability for this deployment).",
            id="platform_v2.W001",
        ))
    return issues
