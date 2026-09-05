from rest_framework.permissions import BasePermission

from .access import ADMIN_ROLES, WRITE_ROLES, is_platform_staff, membership_for


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_platform_staff(request.user)


class IsTenantMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        if is_platform_staff(request.user):
            return True
        tenant_id = getattr(obj, "tenant_id", None) or getattr(obj, "id", None)
        return bool(membership_for(request.user, tenant_id))


class CanEditTenantObject(BasePermission):
    def has_object_permission(self, request, view, obj):
        if is_platform_staff(request.user):
            return True
        tenant_id = getattr(obj, "tenant_id", None) or getattr(obj, "id", None)
        membership = membership_for(request.user, tenant_id)
        if not membership:
            return False
        if request.method in {"GET", "HEAD", "OPTIONS"}:
            return True
        return membership.role in WRITE_ROLES


class CanAdministerTenant(BasePermission):
    def has_object_permission(self, request, view, obj):
        if is_platform_staff(request.user):
            return True
        tenant_id = getattr(obj, "tenant_id", None) or getattr(obj, "id", None)
        membership = membership_for(request.user, tenant_id)
        return bool(membership and membership.role in ADMIN_ROLES)
