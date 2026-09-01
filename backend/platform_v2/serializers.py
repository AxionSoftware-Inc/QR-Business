import ipaddress
import re
import secrets
from urllib.parse import urlparse

from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework import serializers

from .entitlements import enforce_qr_create, for_tenant
from .models import AuditLog, Domain, MediaAsset, Membership, QRCode, Site, SiteVersion, TeamInvitation, Tenant


HOST_LABEL_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


def normalize_custom_hostname(value: str) -> str:
    raw = str(value or "").strip().lower().rstrip(".")
    if not raw or "://" in raw or any(ch in raw for ch in "/?#@"):
        raise serializers.ValidationError("Enter a hostname only, without scheme, path, port, query, or credentials.")
    try:
        hostname = raw.encode("idna").decode("ascii")
    except UnicodeError as exc:
        raise serializers.ValidationError("Hostname cannot be converted to a valid IDNA domain.") from exc
    if len(hostname) > 253 or "." not in hostname:
        raise serializers.ValidationError("Enter a fully-qualified domain name.")
    labels = hostname.split(".")
    if any(not HOST_LABEL_RE.fullmatch(label) for label in labels):
        raise serializers.ValidationError("Hostname contains an invalid DNS label.")
    try:
        ipaddress.ip_address(hostname)
    except ValueError:
        pass
    else:
        raise serializers.ValidationError("IP addresses cannot be used as custom domains.")

    platform_host = (urlparse(getattr(settings, "PUBLIC_WEB_BASE_URL", "")).hostname or "").lower().rstrip(".")
    if platform_host and (hostname == platform_host or hostname.endswith(f".{platform_host}")):
        raise serializers.ValidationError("The platform-owned domain cannot be claimed as a custom domain.")
    return hostname


def _actor(serializer):
    request = serializer.context.get("request") if serializer.context else None
    user = getattr(request, "user", None)
    return user if user and user.is_authenticated else None


class MembershipSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "user", "email", "name", "role", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class TeamInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamInvitation
        fields = ["id", "tenant", "email", "role", "status", "expires_at", "invited_by", "accepted_by", "accepted_at", "created_at"]
        read_only_fields = fields


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ["id", "name", "slug", "status", "plan", "locale", "timezone", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class SiteVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteVersion
        fields = ["id", "version", "title", "description", "template_key", "theme", "blocks", "seo", "created_by", "created_at"]
        read_only_fields = fields


class SiteSerializer(serializers.ModelSerializer):
    draft = SiteVersionSerializer(source="draft_version", read_only=True)
    published = SiteVersionSerializer(source="published_version", read_only=True)

    class Meta:
        model = Site
        fields = ["id", "tenant", "slug", "name", "status", "draft", "published", "published_at", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "published_at", "created_at", "updated_at"]


class PublicSiteSerializer(serializers.ModelSerializer):
    site_id = serializers.UUIDField(source="id", read_only=True)
    tenant_id = serializers.UUIDField(source="tenant.id", read_only=True)
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    title = serializers.CharField(source="published_version.title", read_only=True)
    description = serializers.CharField(source="published_version.description", read_only=True)
    template_key = serializers.CharField(source="published_version.template_key", read_only=True)
    theme = serializers.JSONField(source="published_version.theme", read_only=True)
    blocks = serializers.JSONField(source="published_version.blocks", read_only=True)
    seo = serializers.JSONField(source="published_version.seo", read_only=True)
    version = serializers.IntegerField(source="published_version.version", read_only=True)
    show_platform_branding = serializers.SerializerMethodField()

    def get_show_platform_branding(self, obj):
        return not for_tenant(obj.tenant).remove_branding

    class Meta:
        model = Site
        fields = ["site_id", "tenant_id", "tenant_slug", "slug", "name", "title", "description", "template_key", "theme", "blocks", "seo", "version", "published_at", "show_platform_branding"]


class DomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Domain
        fields = ["id", "tenant", "site", "hostname", "kind", "status", "verified_at", "created_at", "updated_at"]
        read_only_fields = ["id", "kind", "status", "verified_at", "created_at", "updated_at"]

    def validate_hostname(self, value):
        return normalize_custom_hostname(value)

    def validate(self, attrs):
        tenant = self.instance.tenant if self.instance else attrs.get("tenant")
        requested_tenant = attrs.get("tenant")
        if self.instance and requested_tenant and requested_tenant.id != self.instance.tenant_id:
            raise serializers.ValidationError({"tenant": "A domain cannot be moved between tenants."})
        site = attrs.get("site", self.instance.site if self.instance else None)
        if tenant and site and site.tenant_id != tenant.id:
            raise serializers.ValidationError({"site": "Site must belong to the domain tenant."})
        return attrs

    def create(self, validated_data):
        instance = super().create(validated_data)
        AuditLog.objects.create(
            tenant=instance.tenant,
            actor=_actor(self),
            action="domain.created",
            object_type="domain",
            object_id=str(instance.id),
            metadata={"hostname": instance.hostname, "site_id": str(instance.site_id or "")},
        )
        return instance

    def update(self, instance, validated_data):
        validated_data.pop("tenant", None)
        previous_hostname = instance.hostname
        previous_site_id = instance.site_id
        instance = super().update(instance, validated_data)
        hostname_changed = instance.hostname != previous_hostname
        if hostname_changed:
            instance.status = Domain.Status.PENDING
            instance.verified_at = None
            instance.verification_token = secrets.token_urlsafe(48)
            instance.save(update_fields=["status", "verified_at", "verification_token", "updated_at"])
        if hostname_changed or instance.site_id != previous_site_id:
            AuditLog.objects.create(
                tenant=instance.tenant,
                actor=_actor(self),
                action="domain.updated",
                object_type="domain",
                object_id=str(instance.id),
                metadata={
                    "hostname_from": previous_hostname,
                    "hostname_to": instance.hostname,
                    "site_from": str(previous_site_id or ""),
                    "site_to": str(instance.site_id or ""),
                    "verification_reset": hostname_changed,
                },
            )
        return instance


class QRCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = QRCode
        fields = ["id", "tenant", "site", "code", "label", "campaign", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "code", "created_at", "updated_at"]

    def validate(self, attrs):
        tenant = self.instance.tenant if self.instance else attrs.get("tenant")
        requested_tenant = attrs.get("tenant")
        if self.instance and requested_tenant and requested_tenant.id != self.instance.tenant_id:
            raise serializers.ValidationError({"tenant": "A QR code cannot be moved between tenants."})
        site = attrs.get("site", self.instance.site if self.instance else None)
        if tenant and site and site.tenant_id != tenant.id:
            raise serializers.ValidationError({"site": "Site must belong to the QR-code tenant."})
        return attrs

    def create(self, validated_data):
        enforce_qr_create(validated_data["tenant"])
        instance = super().create(validated_data)
        AuditLog.objects.create(
            tenant=instance.tenant,
            actor=_actor(self),
            action="qr.created",
            object_type="qr_code",
            object_id=str(instance.id),
            metadata={"site_id": str(instance.site_id), "label": instance.label, "campaign": instance.campaign},
        )
        return instance

    def update(self, instance, validated_data):
        validated_data.pop("tenant", None)
        if not instance.is_active and validated_data.get("is_active") is True:
            enforce_qr_create(instance.tenant)
        before = {"site_id": str(instance.site_id), "label": instance.label, "campaign": instance.campaign, "is_active": instance.is_active}
        instance = super().update(instance, validated_data)
        after = {"site_id": str(instance.site_id), "label": instance.label, "campaign": instance.campaign, "is_active": instance.is_active}
        if before != after:
            AuditLog.objects.create(
                tenant=instance.tenant,
                actor=_actor(self),
                action="qr.updated",
                object_type="qr_code",
                object_id=str(instance.id),
                metadata={"before": before, "after": after},
            )
        return instance


class MediaAssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = MediaAsset
        fields = ["id", "tenant", "kind", "url", "original_name", "content_type", "byte_size", "width", "height", "sha256", "alt", "created_at"]
        read_only_fields = fields

    def get_url(self, obj):
        return default_storage.url(obj.storage_key)


class DraftPayloadSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=180)
    description = serializers.CharField(required=False, allow_blank=True)
    template_key = serializers.CharField(max_length=64, required=False, default="default")
    theme = serializers.JSONField(required=False)
    blocks = serializers.JSONField(required=False)
    seo = serializers.JSONField(required=False)


class EventSerializer(serializers.Serializer):
    event_type = serializers.ChoiceField(choices=["view", "cta_click"])
    target = serializers.CharField(max_length=80, required=False, allow_blank=True)
    metadata = serializers.JSONField(required=False)
