from rest_framework.permissions import BasePermission

from .models import Membership, Tenant


WRITE_ROLES={Membership.Role.OWNER,Membership.Role.ADMIN,Membership.Role.EDITOR}
ADMIN_ROLES={Membership.Role.OWNER,Membership.Role.ADMIN}
ACTIVE_TENANT_STATUSES=(Tenant.Status.TRIAL,Tenant.Status.ACTIVE)


def active_membership(user,tenant_id):
    if not user or not user.is_authenticated:return None
    return Membership.objects.filter(user=user,tenant_id=tenant_id,is_active=True,tenant__status__in=ACTIVE_TENANT_STATUSES).first()


def is_platform_staff(user):return bool(user and user.is_authenticated and user.is_staff)


class IsPlatformAdmin(BasePermission):
    def has_permission(self,request,view):return is_platform_staff(request.user)


class IsTenantMember(BasePermission):
    def has_object_permission(self,request,view,obj):
        if is_platform_staff(request.user):return True
        tenant_id=getattr(obj,"tenant_id",None) or getattr(obj,"id",None)
        return bool(active_membership(request.user,tenant_id))


class CanEditTenantObject(BasePermission):
    def has_object_permission(self,request,view,obj):
        if is_platform_staff(request.user):return True
        tenant_id=getattr(obj,"tenant_id",None) or getattr(obj,"id",None);membership=active_membership(request.user,tenant_id)
        if not membership:return False
        if request.method in {"GET","HEAD","OPTIONS"}:return True
        return membership.role in WRITE_ROLES


class CanAdministerTenant(BasePermission):
    def has_object_permission(self,request,view,obj):
        if is_platform_staff(request.user):return True
        tenant_id=getattr(obj,"tenant_id",None) or getattr(obj,"id",None);membership=active_membership(request.user,tenant_id)
        return bool(membership and membership.role in ADMIN_ROLES)
