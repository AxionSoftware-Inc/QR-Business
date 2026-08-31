import secrets
import uuid

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import Q


slug_validator = RegexValidator(
    regex=r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$",
    message="Slug must be lowercase ASCII letters, numbers, and hyphens.",
)


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Tenant(TimeStampedModel):
    class Status(models.TextChoices):
        TRIAL = "trial", "Trial"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        ARCHIVED = "archived", "Archived"

    class Plan(models.TextChoices):
        FREE = "free", "Free"
        STARTER = "starter", "Starter"
        PRO = "pro", "Pro"
        BUSINESS = "business", "Business"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=160)
    slug = models.CharField(max_length=63, unique=True, validators=[slug_validator])
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.FREE)
    locale = models.CharField(max_length=16, default="en")
    timezone = models.CharField(max_length=64, default="UTC")

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Membership(TimeStampedModel):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        EDITOR = "editor", "Editor"
        ANALYST = "analyst", "Analyst"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, related_name="memberships", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="qr_memberships", on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.EDITOR)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["tenant", "user"], name="v2_unique_tenant_member"),
        ]
        indexes = [models.Index(fields=["user", "is_active"])]


class Site(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        DISABLED = "disabled", "Disabled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, related_name="sites", on_delete=models.CASCADE)
    slug = models.CharField(max_length=63, validators=[slug_validator])
    name = models.CharField(max_length=180)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    draft_version = models.ForeignKey(
        "SiteVersion",
        related_name="draft_for_sites",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    published_version = models.ForeignKey(
        "SiteVersion",
        related_name="published_for_sites",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["tenant", "slug"], name="v2_unique_site_slug_per_tenant"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["slug", "status"]),
        ]

    def __str__(self) -> str:
        return self.name


class SiteVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    site = models.ForeignKey(Site, related_name="versions", on_delete=models.CASCADE)
    version = models.PositiveIntegerField()
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    template_key = models.CharField(max_length=64, default="default")
    theme = models.JSONField(default=dict)
    blocks = models.JSONField(default=list)
    seo = models.JSONField(default=dict)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="qr_site_versions",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["site", "version"], name="v2_unique_site_version"),
        ]
        ordering = ["-version"]


class Domain(TimeStampedModel):
    class Kind(models.TextChoices):
        SUBDOMAIN = "subdomain", "Subdomain"
        CUSTOM = "custom", "Custom"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        FAILED = "failed", "Failed"
        DISABLED = "disabled", "Disabled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, related_name="domains", on_delete=models.CASCADE)
    site = models.ForeignKey(Site, related_name="domains", null=True, blank=True, on_delete=models.CASCADE)
    hostname = models.CharField(max_length=253, unique=True)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.SUBDOMAIN)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    verification_token = models.CharField(max_length=96, unique=True, editable=False)
    verified_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.verification_token:
            self.verification_token = secrets.token_urlsafe(48)
        self.hostname = self.hostname.strip().lower().rstrip(".")
        super().save(*args, **kwargs)


class QRCode(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, related_name="qr_codes", on_delete=models.CASCADE)
    site = models.ForeignKey(Site, related_name="qr_codes", on_delete=models.CASCADE)
    code = models.CharField(max_length=32, unique=True, editable=False)
    label = models.CharField(max_length=120, blank=True)
    campaign = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=["tenant", "is_active"])]

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = secrets.token_urlsafe(16).replace("-", "").replace("_", "")[:22]
        super().save(*args, **kwargs)


class AnalyticsEvent(models.Model):
    class EventType(models.TextChoices):
        VIEW = "view", "View"
        QR_SCAN = "qr_scan", "QR scan"
        CTA_CLICK = "cta_click", "CTA click"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, related_name="analytics_events", on_delete=models.CASCADE)
    site = models.ForeignKey(Site, related_name="analytics_events", on_delete=models.CASCADE)
    qr_code = models.ForeignKey(
        QRCode,
        related_name="analytics_events",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    target = models.CharField(max_length=80, blank=True)
    visitor_hash = models.CharField(max_length=64, blank=True)
    referrer_domain = models.CharField(max_length=253, blank=True)
    country_code = models.CharField(max_length=2, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "occurred_at"]),
            models.Index(fields=["site", "event_type", "occurred_at"]),
            models.Index(fields=["qr_code", "occurred_at"]),
        ]
        ordering = ["-occurred_at"]


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, related_name="audit_logs", null=True, blank=True, on_delete=models.SET_NULL)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="qr_audit_logs",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    action = models.CharField(max_length=120)
    object_type = models.CharField(max_length=80, blank=True)
    object_id = models.CharField(max_length=64, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["tenant", "created_at"])]
        ordering = ["-created_at"]
