from django.contrib import admin

from .models import Domain, Site, Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "plan", "status", "created_at")
    list_filter = ("plan", "status")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ("hostname", "tenant", "type", "status", "verified_at")
    list_filter = ("type", "status")
    search_fields = ("hostname", "tenant__name", "tenant__slug")


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ("title", "tenant", "template_key", "status", "published_at")
    list_filter = ("template_key", "status")
    search_fields = ("title", "tenant__name", "tenant__slug")

