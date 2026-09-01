from dataclasses import dataclass

from rest_framework.exceptions import PermissionDenied

from .models import Domain, MediaAsset, Membership, QRCode, Site, TeamInvitation, Tenant


@dataclass(frozen=True)
class PlanEntitlements:
    max_sites: int
    max_members: int
    max_media_assets: int
    max_qr_codes: int
    max_custom_domains: int
    custom_domains: bool
    advanced_analytics: bool
    remove_branding: bool


PLAN_ENTITLEMENTS = {
    Tenant.Plan.FREE: PlanEntitlements(
        max_sites=1,
        max_members=1,
        max_media_assets=25,
        max_qr_codes=5,
        max_custom_domains=0,
        custom_domains=False,
        advanced_analytics=False,
        remove_branding=False,
    ),
    Tenant.Plan.STARTER: PlanEntitlements(
        max_sites=3,
        max_members=1,
        max_media_assets=250,
        max_qr_codes=25,
        max_custom_domains=0,
        custom_domains=False,
        advanced_analytics=True,
        remove_branding=True,
    ),
    Tenant.Plan.PRO: PlanEntitlements(
        max_sites=10,
        max_members=3,
        max_media_assets=2000,
        max_qr_codes=250,
        max_custom_domains=10,
        custom_domains=True,
        advanced_analytics=True,
        remove_branding=True,
    ),
    Tenant.Plan.BUSINESS: PlanEntitlements(
        max_sites=100,
        max_members=25,
        max_media_assets=20000,
        max_qr_codes=2500,
        max_custom_domains=100,
        custom_domains=True,
        advanced_analytics=True,
        remove_branding=True,
    ),
}


def for_tenant(tenant: Tenant) -> PlanEntitlements:
    return PLAN_ENTITLEMENTS.get(tenant.plan, PLAN_ENTITLEMENTS[Tenant.Plan.FREE])


def entitlement_payload(tenant: Tenant):
    e = for_tenant(tenant)
    active_members = Membership.objects.filter(tenant=tenant, is_active=True).count()
    pending_invitations = TeamInvitation.objects.filter(tenant=tenant, status=TeamInvitation.Status.PENDING).count()
    active_sites = Site.objects.filter(tenant=tenant).exclude(status=Site.Status.DISABLED).count()
    media_assets = MediaAsset.objects.filter(tenant=tenant).count()
    active_qr_codes = QRCode.objects.filter(tenant=tenant, is_active=True).count()
    custom_domains = Domain.objects.filter(
        tenant=tenant,
        kind=Domain.Kind.CUSTOM,
    ).exclude(status=Domain.Status.DISABLED).count()
    return {
        "plan": tenant.plan,
        "limits": {
            "sites": e.max_sites,
            "members": e.max_members,
            "media_assets": e.max_media_assets,
            "qr_codes": e.max_qr_codes,
            "custom_domains": e.max_custom_domains,
        },
        "features": {
            "custom_domains": e.custom_domains,
            "advanced_analytics": e.advanced_analytics,
            "remove_branding": e.remove_branding,
        },
        "usage": {
            "sites": active_sites,
            "members": active_members,
            "pending_invitations": pending_invitations,
            "reserved_member_seats": active_members + pending_invitations,
            "media_assets": media_assets,
            "qr_codes": active_qr_codes,
            "custom_domains": custom_domains,
        },
    }


def enforce_site_create(tenant: Tenant):
    e = for_tenant(tenant)
    used = Site.objects.filter(tenant=tenant).exclude(status=Site.Status.DISABLED).count()
    if used >= e.max_sites:
        raise PermissionDenied("Your plan has reached its site limit.")


def enforce_member_create(tenant: Tenant):
    e = for_tenant(tenant)
    used = Membership.objects.filter(tenant=tenant, is_active=True).count()
    if used >= e.max_members:
        raise PermissionDenied("Your plan has reached its team-member limit.")


def enforce_invitation_create(tenant: Tenant):
    e = for_tenant(tenant)
    active = Membership.objects.filter(tenant=tenant, is_active=True).count()
    pending = TeamInvitation.objects.filter(tenant=tenant, status=TeamInvitation.Status.PENDING).count()
    if active + pending >= e.max_members:
        raise PermissionDenied("Your plan has no unreserved team seats available.")


def enforce_media_create(tenant: Tenant):
    e = for_tenant(tenant)
    used = MediaAsset.objects.filter(tenant=tenant).count()
    if used >= e.max_media_assets:
        raise PermissionDenied("Your plan has reached its media-asset limit.")


def enforce_qr_create(tenant: Tenant):
    e = for_tenant(tenant)
    used = QRCode.objects.filter(tenant=tenant, is_active=True).count()
    if used >= e.max_qr_codes:
        raise PermissionDenied("Your plan has reached its active QR-code limit.")


def enforce_custom_domain(tenant: Tenant):
    e = for_tenant(tenant)
    if not e.custom_domains or e.max_custom_domains <= 0:
        raise PermissionDenied("Custom domains are not available on this plan.")
    used = Domain.objects.filter(
        tenant=tenant,
        kind=Domain.Kind.CUSTOM,
    ).exclude(status=Domain.Status.DISABLED).count()
    if used >= e.max_custom_domains:
        raise PermissionDenied("Your plan has reached its custom-domain limit.")
