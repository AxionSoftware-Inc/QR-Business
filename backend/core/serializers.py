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
            "owner_token",
            "owner_contact",
            "status",
            "plan",
            "domains",
            "created_at",
            "updated_at",
        ]


class SiteSerializer(serializers.ModelSerializer):
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    owner_token = serializers.SerializerMethodField()
    owner_contact = serializers.SerializerMethodField()
    owner_recovery_code = serializers.SerializerMethodField()
    domains = serializers.SerializerMethodField()
    templateKey = serializers.CharField(source="template_key", read_only=True)
    publishedAt = serializers.DateTimeField(source="published_at", read_only=True)

    def should_include_owner_fields(self):
        view = self.context.get("view")
        return getattr(view, "action", "") in {"guest_create", "guest_update", "my_sites"}

    def get_owner_token(self, obj):
        return obj.tenant.owner_token if self.should_include_owner_fields() else None

    def get_owner_contact(self, obj):
        return obj.tenant.owner_contact if self.should_include_owner_fields() else None

    def get_owner_recovery_code(self, obj):
        return obj.tenant.owner_recovery_code if self.should_include_owner_fields() else None

    def get_domains(self, obj):
        return [
            {
                "hostname": domain.hostname,
                "status": domain.status,
                "type": domain.type,
            }
            for domain in obj.tenant.domains.all()
        ]

    class Meta:
        model = Site
        fields = [
            "id",
            "tenant",
            "tenant_slug",
            "owner_token",
            "owner_contact",
            "owner_recovery_code",
            "domains",
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
