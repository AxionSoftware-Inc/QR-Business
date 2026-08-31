from django.contrib import admin

from .models import AnalyticsEvent, AuditLog, Domain, Membership, QRCode, Site, SiteVersion, Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "status", "plan", "locale", "timezone", "created_at")
    list_filter = ("status", "plan", "locale")
    search_fields = ("name", "slug")


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("tenant", "user", "role", "is_active", "created_at")
    list_filter = ("role", "is_active")
    search_fields = ("tenant__name", "tenant__slug", "user__username", "user__email")


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "slug", "status", "published_at", "updated_at")
    list_filter = ("status",)
    search_fields = ("name", "slug", "tenant__name", "tenant__slug")


@admin.register(SiteVersion)
class SiteVersionAdmin(admin.ModelAdmin):
    list_display = ("site", "version", "title", "created_by", "created_at")
    search_fields = ("site__name", "site__tenant__name", "title")
    readonly_fields = ("site", "version", "title", "description", "template_key", "theme", "blocks", "seo", "created_by", "created_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ("hostname", "tenant", "site", "kind", "status", "verified_at")
    list_filter = ("kind", "status")
    search_fields = ("hostname", "tenant__name", "tenant__slug")
    readonly_fields = ("verification_token",)


@admin.register(QRCode)
class QRCodeAdmin(admin.ModelAdmin):
    list_display = ("code", "tenant", "site", "label", "campaign", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("code", "label", "campaign", "tenant__name", "site__name")
    readonly_fields = ("code",)


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "tenant", "site", "target", "occurred_at")
    list_filter = ("event_type",)
    search_fields = ("tenant__name", "site__name", "target", "referrer_domain")
    readonly_fields = tuple(field.name for field in AnalyticsEvent._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "tenant", "actor", "object_type", "object_id", "created_at")
    list_filter = ("action", "object_type")
    search_fields = ("action", "object_id", "tenant__name", "actor__username", "actor__email")
    readonly_fields = tuple(field.name for field in AuditLog._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
