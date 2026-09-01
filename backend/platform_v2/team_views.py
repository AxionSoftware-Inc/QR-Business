import hashlib
import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .entitlements import enforce_invitation_create, enforce_member_create
from .models import AuditLog, Membership, TeamInvitation, Tenant
from .serializers import MembershipSerializer, TeamInvitationSerializer
from .views import can_admin, membership_for, user_tenant_ids


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _is_owner(user, tenant_id):
    if user.is_staff:
        return True
    membership = membership_for(user, tenant_id)
    return bool(membership and membership.role == Membership.Role.OWNER)


class TeamInvitationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tenant_id):
        tenant = Tenant.objects.filter(id=tenant_id, id__in=user_tenant_ids(request.user)).first()
        if not tenant or not can_admin(request.user, tenant.id):
            return Response({"detail": "Owner or admin role required."}, status=403)
        return Response(TeamInvitationSerializer(tenant.team_invitations.order_by("-created_at")[:100], many=True).data)

    @transaction.atomic
    def post(self, request, tenant_id):
        tenant = Tenant.objects.select_for_update().filter(id=tenant_id, id__in=user_tenant_ids(request.user)).first()
        if not tenant or not can_admin(request.user, tenant.id):
            return Response({"detail": "Owner or admin role required."}, status=403)
        email = str(request.data.get("email") or "").strip().lower()
        role = str(request.data.get("role") or Membership.Role.EDITOR)
        if not email or "@" not in email:
            return Response({"detail": "Valid email is required."}, status=400)
        if role not in {Membership.Role.ADMIN, Membership.Role.EDITOR, Membership.Role.ANALYST}:
            return Response({"detail": "Invitation role must be admin, editor, or analyst."}, status=400)
        if tenant.memberships.filter(user__email__iexact=email, is_active=True).exists():
            return Response({"detail": "This user is already a team member."}, status=409)
        tenant.team_invitations.filter(email__iexact=email, status=TeamInvitation.Status.PENDING).update(status=TeamInvitation.Status.REVOKED)
        enforce_invitation_create(tenant)
        raw_token = secrets.token_urlsafe(48)
        invitation = TeamInvitation.objects.create(tenant=tenant, invited_by=request.user, email=email, role=role, token_hash=_hash_token(raw_token), expires_at=timezone.now() + timedelta(days=7))
        AuditLog.objects.create(tenant=tenant, actor=request.user, action="team.invite", object_type="team_invitation", object_id=str(invitation.id), metadata={"email": email, "role": role})
        payload = TeamInvitationSerializer(invitation).data
        payload["token"] = raw_token
        return Response(payload, status=status.HTTP_201_CREATED)


class TeamInvitationRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, invitation_id):
        invitation = TeamInvitation.objects.select_related("tenant").filter(id=invitation_id, tenant_id__in=user_tenant_ids(request.user)).first()
        if not invitation or not can_admin(request.user, invitation.tenant_id):
            return Response({"detail": "Owner or admin role required."}, status=403)
        if invitation.status == TeamInvitation.Status.PENDING:
            invitation.status = TeamInvitation.Status.REVOKED
            invitation.save(update_fields=["status", "updated_at"])
            AuditLog.objects.create(tenant=invitation.tenant, actor=request.user, action="team.invite_revoke", object_type="team_invitation", object_id=str(invitation.id), metadata={"email": invitation.email})
        return Response(TeamInvitationSerializer(invitation).data)


class TeamInvitationAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        raw_token = str(request.data.get("token") or "").strip()
        if not raw_token:
            return Response({"detail": "Invitation token is required."}, status=400)
        invitation = TeamInvitation.objects.select_for_update().select_related("tenant").filter(token_hash=_hash_token(raw_token)).first()
        if not invitation:
            return Response({"detail": "Invitation not found."}, status=404)
        if invitation.status != TeamInvitation.Status.PENDING:
            return Response({"detail": "Invitation is no longer active."}, status=409)
        if invitation.expires_at <= timezone.now():
            invitation.status = TeamInvitation.Status.EXPIRED
            invitation.save(update_fields=["status", "updated_at"])
            return Response({"detail": "Invitation has expired."}, status=410)
        if request.user.email.strip().lower() != invitation.email.strip().lower():
            return Response({"detail": "Sign in with the invited email address."}, status=403)
        enforce_member_create(invitation.tenant)
        membership, _ = Membership.objects.update_or_create(tenant=invitation.tenant, user=request.user, defaults={"role": invitation.role, "is_active": True})
        invitation.status = TeamInvitation.Status.ACCEPTED
        invitation.accepted_by = request.user
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["status", "accepted_by", "accepted_at", "updated_at"])
        AuditLog.objects.create(tenant=invitation.tenant, actor=request.user, action="team.invite_accept", object_type="membership", object_id=str(membership.id), metadata={"role": membership.role})
        return Response(MembershipSerializer(membership).data, status=status.HTTP_201_CREATED)


class TeamMemberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, membership_id):
        member = Membership.objects.select_for_update().select_related("tenant", "user").filter(id=membership_id, tenant_id__in=user_tenant_ids(request.user)).first()
        if not member or not can_admin(request.user, member.tenant_id):
            return Response({"detail": "Owner or admin role required."}, status=403)
        requested_role = str(request.data.get("role") or member.role)
        if requested_role == Membership.Role.OWNER:
            return Response({"detail": "Use ownership transfer for the owner role."}, status=400)
        if requested_role not in {Membership.Role.ADMIN, Membership.Role.EDITOR, Membership.Role.ANALYST}:
            return Response({"detail": "Invalid role."}, status=400)
        if member.role == Membership.Role.OWNER and not _is_owner(request.user, member.tenant_id):
            return Response({"detail": "Only an owner can change an owner membership."}, status=403)
        if member.role == Membership.Role.OWNER:
            return Response({"detail": "Transfer ownership before changing the owner role."}, status=409)
        previous = member.role
        member.role = requested_role
        member.save(update_fields=["role", "updated_at"])
        AuditLog.objects.create(tenant=member.tenant, actor=request.user, action="team.role_change", object_type="membership", object_id=str(member.id), metadata={"from": previous, "to": requested_role})
        return Response(MembershipSerializer(member).data)

    @transaction.atomic
    def delete(self, request, membership_id):
        member = Membership.objects.select_for_update().select_related("tenant", "user").filter(id=membership_id, tenant_id__in=user_tenant_ids(request.user)).first()
        if not member or not can_admin(request.user, member.tenant_id):
            return Response({"detail": "Owner or admin role required."}, status=403)
        if member.role == Membership.Role.OWNER:
            return Response({"detail": "Owner cannot be removed. Transfer ownership first."}, status=409)
        if member.user_id == request.user.id and not _is_owner(request.user, member.tenant_id):
            return Response({"detail": "Admins cannot remove themselves from this endpoint."}, status=409)
        member.is_active = False
        member.save(update_fields=["is_active", "updated_at"])
        AuditLog.objects.create(tenant=member.tenant, actor=request.user, action="team.member_remove", object_type="membership", object_id=str(member.id), metadata={"email": member.user.email})
        return Response(status=status.HTTP_204_NO_CONTENT)


class OwnershipTransferView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, tenant_id):
        tenant = Tenant.objects.select_for_update().filter(id=tenant_id, id__in=user_tenant_ids(request.user)).first()
        if not tenant or not _is_owner(request.user, tenant.id):
            return Response({"detail": "Owner role required."}, status=403)
        target_id = str(request.data.get("membership_id") or "").strip()
        target = Membership.objects.select_for_update().select_related("user").filter(id=target_id, tenant=tenant, is_active=True).first()
        current = Membership.objects.select_for_update().filter(tenant=tenant, user=request.user, is_active=True, role=Membership.Role.OWNER).first()
        if not target or not current:
            return Response({"detail": "Target or current owner membership not found."}, status=404)
        if target.id == current.id:
            return Response({"detail": "Target is already the owner."}, status=409)
        previous_target_role = target.role
        target.role = Membership.Role.OWNER
        target.save(update_fields=["role", "updated_at"])
        current.role = Membership.Role.ADMIN
        current.save(update_fields=["role", "updated_at"])
        AuditLog.objects.create(tenant=tenant, actor=request.user, action="team.ownership_transfer", object_type="membership", object_id=str(target.id), metadata={"new_owner_email": target.user.email, "previous_target_role": previous_target_role})
        return Response({"new_owner": MembershipSerializer(target).data, "previous_owner": MembershipSerializer(current).data})
