import hashlib
import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .entitlements import enforce_member_create
from .models import AuditLog, Membership, TeamInvitation, Tenant
from .serializers import MembershipSerializer, TeamInvitationSerializer
from .views import can_admin, user_tenant_ids


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class TeamInvitationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tenant_id):
        tenant = Tenant.objects.filter(id=tenant_id, id__in=user_tenant_ids(request.user)).first()
        if not tenant or not can_admin(request.user, tenant.id):
            return Response({"detail": "Owner or admin role required."}, status=403)
        rows = tenant.team_invitations.order_by("-created_at")[:100]
        return Response(TeamInvitationSerializer(rows, many=True).data)

    @transaction.atomic
    def post(self, request, tenant_id):
        tenant = Tenant.objects.select_for_update().filter(id=tenant_id, id__in=user_tenant_ids(request.user)).first()
        if not tenant or not can_admin(request.user, tenant.id):
            return Response({"detail": "Owner or admin role required."}, status=403)

        enforce_member_create(tenant)
        email = str(request.data.get("email") or "").strip().lower()
        role = str(request.data.get("role") or Membership.Role.EDITOR)
        if not email or "@" not in email:
            return Response({"detail": "Valid email is required."}, status=400)
        if role not in {Membership.Role.ADMIN, Membership.Role.EDITOR, Membership.Role.ANALYST}:
            return Response({"detail": "Invitation role must be admin, editor, or analyst."}, status=400)
        if tenant.memberships.filter(user__email__iexact=email, is_active=True).exists():
            return Response({"detail": "This user is already a team member."}, status=409)

        tenant.team_invitations.filter(email__iexact=email, status=TeamInvitation.Status.PENDING).update(status=TeamInvitation.Status.REVOKED)
        raw_token = secrets.token_urlsafe(48)
        invitation = TeamInvitation.objects.create(
            tenant=tenant,
            invited_by=request.user,
            email=email,
            role=role,
            token_hash=_hash_token(raw_token),
            expires_at=timezone.now() + timedelta(days=7),
        )
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
        membership, _ = Membership.objects.update_or_create(
            tenant=invitation.tenant,
            user=request.user,
            defaults={"role": invitation.role, "is_active": True},
        )
        invitation.status = TeamInvitation.Status.ACCEPTED
        invitation.accepted_by = request.user
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["status", "accepted_by", "accepted_at", "updated_at"])
        AuditLog.objects.create(tenant=invitation.tenant, actor=request.user, action="team.invite_accept", object_type="membership", object_id=str(membership.id), metadata={"role": membership.role})
        return Response(MembershipSerializer(membership).data, status=status.HTTP_201_CREATED)
