import hashlib
import secrets
from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, UnidentifiedImageError
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .access import can_write, user_tenant_ids
from .entitlements import enforce_media_create
from .models import AuditLog, MediaAsset, Tenant
from .serializers import MediaAssetSerializer


MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_SIDE = 10_000
MAX_IMAGE_PIXELS = 40_000_000
ALLOWED_IMAGE_TYPES = {
    "JPEG": ("image/jpeg", ".jpg"),
    "PNG": ("image/png", ".png"),
    "WEBP": ("image/webp", ".webp"),
}


class MediaAssetViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    throttle_scope = "upload_media"

    def _queryset(self, request):
        return MediaAsset.objects.filter(tenant_id__in=user_tenant_ids(request.user)).select_related("tenant")

    def list(self, request):
        tenant_id = request.query_params.get("tenant")
        rows = self._queryset(request)
        if tenant_id:
            rows = rows.filter(tenant_id=tenant_id)
        return Response(MediaAssetSerializer(rows[:200], many=True).data)

    def retrieve(self, request, pk=None):
        asset = self._queryset(request).filter(pk=pk).first()
        if not asset:
            return Response({"detail": "Media asset not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(MediaAssetSerializer(asset).data)

    def create(self, request):
        tenant_id = str(request.data.get("tenant") or "").strip()
        if not tenant_id or tenant_id not in {str(value) for value in user_tenant_ids(request.user)}:
            return Response({"detail": "Valid tenant membership is required."}, status=status.HTTP_403_FORBIDDEN)
        if not can_write(request.user, tenant_id):
            return Response({"detail": "Editor, admin, or owner role required."}, status=status.HTTP_403_FORBIDDEN)
        tenant = Tenant.objects.filter(id=tenant_id).first()
        if not tenant:
            return Response({"detail": "Tenant not found."}, status=status.HTTP_404_NOT_FOUND)

        uploaded = request.FILES.get("file")
        if not uploaded:
            return Response({"detail": "file is required."}, status=status.HTTP_400_BAD_REQUEST)
        if uploaded.size <= 0 or uploaded.size > MAX_IMAGE_BYTES:
            return Response({"detail": "Image must be between 1 byte and 8 MB."}, status=status.HTTP_400_BAD_REQUEST)

        raw = uploaded.read(MAX_IMAGE_BYTES + 1)
        if len(raw) > MAX_IMAGE_BYTES:
            return Response({"detail": "Image exceeds 8 MB."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with Image.open(BytesIO(raw)) as image:
                image.verify()
            with Image.open(BytesIO(raw)) as image:
                image_format = str(image.format or "").upper()
                width, height = image.size
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            return Response({"detail": "File is not a safe supported image."}, status=status.HTTP_400_BAD_REQUEST)

        media = ALLOWED_IMAGE_TYPES.get(image_format)
        if not media:
            return Response({"detail": "Only JPEG, PNG and WebP images are supported."}, status=status.HTTP_400_BAD_REQUEST)
        if width <= 0 or height <= 0 or width > MAX_IMAGE_SIDE or height > MAX_IMAGE_SIDE or width * height > MAX_IMAGE_PIXELS:
            return Response({"detail": "Image dimensions are too large."}, status=status.HTTP_400_BAD_REQUEST)

        digest = hashlib.sha256(raw).hexdigest()
        existing = MediaAsset.objects.filter(tenant_id=tenant_id, sha256=digest).first()
        if existing:
            return Response(MediaAssetSerializer(existing).data, status=status.HTTP_200_OK)

        enforce_media_create(tenant)
        content_type, extension = media
        storage_key = f"tenant-media/{tenant_id}/{digest[:2]}/{digest}-{secrets.token_hex(4)}{extension}"
        saved_key = default_storage.save(storage_key, ContentFile(raw))
        try:
            asset = MediaAsset.objects.create(
                tenant_id=tenant_id,
                uploaded_by=request.user,
                storage_key=saved_key,
                original_name=Path(uploaded.name or "image").name[:255],
                content_type=content_type,
                byte_size=len(raw),
                width=width,
                height=height,
                sha256=digest,
                alt=str(request.data.get("alt") or "").strip()[:240],
            )
            AuditLog.objects.create(
                tenant=tenant,
                actor=request.user,
                action="media.created",
                object_type="media_asset",
                object_id=str(asset.id),
                metadata={
                    "content_type": content_type,
                    "byte_size": len(raw),
                    "width": width,
                    "height": height,
                    "sha256": digest,
                },
            )
        except Exception:
            default_storage.delete(saved_key)
            raise
        return Response(MediaAssetSerializer(asset).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        asset = self._queryset(request).filter(pk=pk).first()
        if not asset:
            return Response({"detail": "Media asset not found."}, status=status.HTTP_404_NOT_FOUND)
        if not can_write(request.user, asset.tenant_id):
            return Response({"detail": "Editor, admin, or owner role required."}, status=status.HTTP_403_FORBIDDEN)
        storage_key = asset.storage_key
        tenant = asset.tenant
        asset_id = str(asset.id)
        metadata = {"content_type": asset.content_type, "byte_size": asset.byte_size, "sha256": asset.sha256}
        asset.delete()
        default_storage.delete(storage_key)
        AuditLog.objects.create(
            tenant=tenant,
            actor=request.user,
            action="media.deleted",
            object_type="media_asset",
            object_id=asset_id,
            metadata=metadata,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
