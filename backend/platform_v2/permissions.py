from rest_framework.permissions import BasePermission

from .models import Membership


WRITE_ROLES = {
    Membership.Role.OWNER,
    Membership.Role.ADMIN,
    Membership.Role.EDITOR,
}
ADMIN_ROLES = {
    Membership.Role.OWNER,
    Membership.Role.ADMIN,
}


def active_membership(user, tenant_id):
    if not user or not user.is_authenticated:
        return None
    return Membership.objects.filter(
        user=user,
        tenant_id=tenant_id,
        is_active=True,
    ).first()


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsTenantMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        tenant_id = getattr(obj, "tenant_id", None) or getattr(obj, "id", None)
        return bool(active_membership(request.user, tenant_id))


class CanEditTenantObject(BasePermission):
    def has_object_permission(self, request, view, obj):
        tenant_id = getattr(obj, "tenant_id", None) or getattr(obj, "id", None)
        membership = active_membership(request.user, tenant_id)
        if not membership:
            return False
        if request.method in {"GET", "HEAD", "OPTIONS"}:
            return True
        return membership.role in WRITE_ROLES


class CanAdministerTenant(BasePermission):
    def has_object_permission(self, request, view, obj):
        tenant_id = getattr(obj, "tenant_id", None) or getattr(obj, "id", None)
        membership = active_membership(request.user, tenant_id)
        return bool(membership and membership.role in ADMIN_ROLES)
