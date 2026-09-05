import hashlib
import os
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuthSession, Identity, Membership, Tenant


User = get_user_model()
ACTIVE_TENANT_STATUSES = (Tenant.Status.TRIAL, Tenant.Status.ACTIVE)


def _refresh_days(): return int(os.getenv("JWT_REFRESH_DAYS", "30"))
def _cookie_name(): return os.getenv("JWT_REFRESH_COOKIE_NAME", "qr_refresh")
def _cookie_secure():
    value=os.getenv("JWT_REFRESH_COOKIE_SECURE")
    return (not settings.DEBUG) if value is None else value.lower()=="true"
def _cookie_samesite():
    value=os.getenv("JWT_REFRESH_COOKIE_SAMESITE", "Lax")
    return value if value in {"Lax","Strict","None"} else "Lax"
def _token_hash(raw_token): return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
def _issue_access_token(user): return str(RefreshToken.for_user(user).access_token)


def _new_session(user):
    if not user.is_active:
        raise ValueError("Inactive accounts cannot receive sessions.")
    raw_token=secrets.token_urlsafe(48)
    session=AuthSession.objects.create(user=user,token_hash=_token_hash(raw_token),expires_at=timezone.now()+timedelta(days=_refresh_days()))
    return session,raw_token


def _set_session_cookie(response,raw_token):
    response.set_cookie(_cookie_name(),raw_token,max_age=_refresh_days()*24*60*60,httponly=True,secure=_cookie_secure(),samesite=_cookie_samesite(),path="/api/v2/auth/",domain=os.getenv("JWT_REFRESH_COOKIE_DOMAIN") or None)


def _clear_session_cookie(response):
    response.delete_cookie(_cookie_name(),path="/api/v2/auth/",domain=os.getenv("JWT_REFRESH_COOKIE_DOMAIN") or None,samesite=_cookie_samesite())


def _browser_origin_allowed(request):
    origin=request.headers.get("origin")
    return True if not origin else origin in set(getattr(settings,"CORS_ALLOWED_ORIGINS",[]))


def _unique_username(email,subject):
    base=email.split("@",1)[0].lower()
    safe="".join(char if char.isalnum() or char in "._-" else "-" for char in base).strip(".-_")[:120] or "user"
    if not User.objects.filter(username=safe).exists(): return safe
    suffix=hashlib.sha256(subject.encode("utf-8")).hexdigest()[:12]
    return f"{safe[:120]}-{suffix}"[:150]


def _user_payload(user):
    memberships=(Membership.objects.filter(user=user,is_active=True,tenant__status__in=ACTIVE_TENANT_STATUSES).select_related("tenant").order_by("tenant__name"))
    return {
        "id":str(user.pk),"email":user.email,"name":user.get_full_name() or user.email or user.get_username(),"is_staff":bool(user.is_staff),
        "memberships":[{"tenant_id":str(m.tenant_id),"tenant_name":m.tenant.name,"tenant_slug":m.tenant.slug,"role":m.role} for m in memberships],
    }


@transaction.atomic
def _resolve_google_user(claims):
    subject=str(claims.get("sub") or "").strip(); email=str(claims.get("email") or "").strip().lower()
    if not subject or not email: raise ValueError("Google credential is missing subject or email.")
    if claims.get("email_verified") is not True: raise ValueError("Google email is not verified.")
    identity=(Identity.objects.select_for_update().select_related("user").filter(provider=Identity.Provider.GOOGLE,subject=subject).first())
    if identity:
        if identity.email!=email:
            identity.email=email;identity.save(update_fields=["email","updated_at"])
        return identity.user
    user=User.objects.filter(email__iexact=email).order_by("id").first()
    if not user:
        user=User.objects.create_user(username=_unique_username(email,subject),email=email);user.set_unusable_password()
    given_name=str(claims.get("given_name") or "")[:150];family_name=str(claims.get("family_name") or "")[:150];changed=False
    if given_name and user.first_name!=given_name:user.first_name=given_name;changed=True
    if family_name and user.last_name!=family_name:user.last_name=family_name;changed=True
    if not user.email:user.email=email;changed=True
    if changed:user.save()
    Identity.objects.create(user=user,provider=Identity.Provider.GOOGLE,subject=subject,email=email)
    return user


class GoogleLoginView(APIView):
    permission_classes=[AllowAny];throttle_scope="auth"
    def post(self,request):
        if not _browser_origin_allowed(request): return Response({"detail":"Origin is not allowed."},status=status.HTTP_403_FORBIDDEN)
        client_id=os.getenv("GOOGLE_CLIENT_ID","").strip()
        if not client_id:return Response({"detail":"Google authentication is not configured."},status=status.HTTP_503_SERVICE_UNAVAILABLE)
        credential=str(request.data.get("credential") or "").strip()
        if not credential:return Response({"detail":"credential is required."},status=status.HTTP_400_BAD_REQUEST)
        try:
            claims=google_id_token.verify_oauth2_token(credential,google_requests.Request(),client_id);user=_resolve_google_user(claims)
        except ValueError:return Response({"detail":"Invalid Google credential."},status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({"detail":"Account is disabled."},status=status.HTTP_403_FORBIDDEN)
        session,raw_token=_new_session(user)
        response=Response({"access":_issue_access_token(user),"session_expires_at":session.expires_at.isoformat(),"user":_user_payload(user)})
        _set_session_cookie(response,raw_token);return response


class SessionRefreshView(APIView):
    permission_classes=[AllowAny];throttle_scope="auth"
    @transaction.atomic
    def post(self,request):
        if not _browser_origin_allowed(request):return Response({"detail":"Origin is not allowed."},status=status.HTTP_403_FORBIDDEN)
        raw_token=request.COOKIES.get(_cookie_name(),"")
        if not raw_token:return Response({"detail":"Session not found."},status=status.HTTP_401_UNAUTHORIZED)
        now=timezone.now()
        session=(AuthSession.objects.select_for_update().select_related("user").filter(token_hash=_token_hash(raw_token),revoked_at__isnull=True,expires_at__gt=now,user__is_active=True).first())
        if not session:
            response=Response({"detail":"Session expired or revoked."},status=status.HTTP_401_UNAUTHORIZED);_clear_session_cookie(response);return response
        session.revoked_at=now;session.last_used_at=now;session.save(update_fields=["revoked_at","last_used_at"])
        new_session,new_raw_token=_new_session(session.user)
        response=Response({"access":_issue_access_token(session.user),"session_expires_at":new_session.expires_at.isoformat(),"user":_user_payload(session.user)})
        _set_session_cookie(response,new_raw_token);return response


class LogoutView(APIView):
    permission_classes=[AllowAny];throttle_scope="auth"
    @transaction.atomic
    def post(self,request):
        if not _browser_origin_allowed(request):return Response({"detail":"Origin is not allowed."},status=status.HTTP_403_FORBIDDEN)
        raw_token=request.COOKIES.get(_cookie_name(),"")
        if raw_token:
            now=timezone.now();AuthSession.objects.select_for_update().filter(token_hash=_token_hash(raw_token),revoked_at__isnull=True).update(revoked_at=now,last_used_at=now)
        response=Response(status=status.HTTP_204_NO_CONTENT);_clear_session_cookie(response);return response


class MeView(APIView):
    permission_classes=[IsAuthenticated]
    def get(self,request):
        if not request.user.is_active:return Response({"detail":"Account is disabled."},status=status.HTTP_401_UNAUTHORIZED)
        return Response({"user":_user_payload(request.user)})
