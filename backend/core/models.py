from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Tenant(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        BLOCKED = "blocked", "Blocked"
        ARCHIVED = "archived", "Archived"

    class Plan(models.TextChoices):
        ODDIY = "oddiy", "Oddiy"
        PLUS = "plus", "Plus"
        PRO = "pro", "Pro"

    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=80, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.ODDIY)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Domain(TimeStampedModel):
    class Type(models.TextChoices):
        SUBDOMAIN = "subdomain", "Subdomain"
        CUSTOM = "custom", "Custom"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        BLOCKED = "blocked", "Blocked"

    tenant = models.ForeignKey(Tenant, related_name="domains", on_delete=models.CASCADE)
    hostname = models.CharField(max_length=255, unique=True)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.SUBDOMAIN)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["hostname"]

    def __str__(self) -> str:
        return self.hostname


class Site(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        DISABLED = "disabled", "Disabled"

    class TemplateKey(models.TextChoices):
        ODDIY = "oddiy", "Oddiy"
        PLUS = "plus", "Plus"
        PRO = "pro", "Pro"

    tenant = models.OneToOneField(Tenant, related_name="site", on_delete=models.CASCADE)
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    template_key = models.CharField(
        max_length=20,
        choices=TemplateKey.choices,
        default=TemplateKey.ODDIY,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    theme = models.JSONField(default=dict)
    blocks = models.JSONField(default=list)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["title"]

    def __str__(self) -> str:
        return self.title

