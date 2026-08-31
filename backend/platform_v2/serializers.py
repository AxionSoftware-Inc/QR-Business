from django.core.files.storage import default_storage
from rest_framework import serializers

from .models import Domain, MediaAsset, Membership, QRCode, Site, SiteVersion, Tenant


class MembershipSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "user", "email", "name", "role", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


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

    class Meta:
        model = Site
        fields = ["site_id", "tenant_id", "tenant_slug", "slug", "name", "title", "description", "template_key", "theme", "blocks", "seo", "version", "published_at"]


class DomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Domain
        fields = ["id", "tenant", "site", "hostname", "kind", "status", "verified_at", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "verified_at", "created_at", "updated_at"]


class QRCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = QRCode
        fields = ["id", "tenant", "site", "code", "label", "campaign", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "code", "created_at", "updated_at"]


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
    event_type = serializers.ChoiceField(choices=["cta_click"])
    target = serializers.CharField(max_length=80, required=False, allow_blank=True)
    metadata = serializers.JSONField(required=False)
