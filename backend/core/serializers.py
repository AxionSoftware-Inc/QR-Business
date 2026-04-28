from rest_framework import serializers

from .models import Domain, Site, Tenant


class DomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Domain
        fields = [
            "id",
            "tenant",
            "hostname",
            "type",
            "status",
            "verified_at",
            "created_at",
            "updated_at",
        ]


class TenantSerializer(serializers.ModelSerializer):
    domains = DomainSerializer(many=True, read_only=True)

    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "status",
            "plan",
            "domains",
            "created_at",
            "updated_at",
        ]


class SiteSerializer(serializers.ModelSerializer):
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    templateKey = serializers.CharField(source="template_key", read_only=True)
    publishedAt = serializers.DateTimeField(source="published_at", read_only=True)

    class Meta:
        model = Site
        fields = [
            "id",
            "tenant",
            "tenant_slug",
            "title",
            "description",
            "template_key",
            "templateKey",
            "status",
            "theme",
            "blocks",
            "published_at",
            "publishedAt",
            "created_at",
            "updated_at",
        ]

