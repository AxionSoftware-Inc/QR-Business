from .models import Membership, Tenant


ACTIVE_TENANT_STATUSES = (Tenant.Status.TRIAL, Tenant.Status.ACTIVE)
WRITE_ROLES = {Membership.Role.OWNER, Membership.Role.ADMIN, Membership.Role.EDITOR}
ADMIN_ROLES = {Membership.Role.OWNER, Membership.Role.ADMIN}


def is_platform_staff(user):
    return bool(user and user.is_authenticated and user.is_staff)


def user_tenant_ids(user):
    if not user or not user.is_authenticated:
        return []
    if is_platform_staff(user):
        return Tenant.objects.values_list("id", flat=True)
    return Membership.objects.filter(
        user=user,
        is_active=True,
        tenant__status__in=ACTIVE_TENANT_STATUSES,
    ).values_list("tenant_id", flat=True)


def membership_for(user, tenant_id):
    if not user or not user.is_authenticated or is_platform_staff(user):
        return None
    return Membership.objects.filter(
        user=user,
        tenant_id=tenant_id,
        is_active=True,
        tenant__status__in=ACTIVE_TENANT_STATUSES,
    ).first()


def can_access_tenant(user, tenant_id):
    if is_platform_staff(user):
        return True
    return membership_for(user, tenant_id) is not None


def can_write(user, tenant_id):
    if is_platform_staff(user):
        return True
    membership = membership_for(user, tenant_id)
    return bool(membership and membership.role in WRITE_ROLES)


def can_admin(user, tenant_id):
    if is_platform_staff(user):
        return True
    membership = membership_for(user, tenant_id)
    return bool(membership and membership.role in ADMIN_ROLES)
