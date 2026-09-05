import hashlib
import secrets
import warnings
from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .access import can_write, user_tenant_ids
from .entitlements import enforce_media_create
from .models import AuditLog, MediaAsset, Tenant
from .pagination import V2PageNumberPagination
from .serializers import MediaAssetSerializer


MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_SIDE = 10_000
MAX_IMAGE_PIXELS = 40_000_000
ALLOWED_IMAGE_TYPES = {
    "JPEG": ("image/jpeg", ".jpg"),
    "PNG": ("image/png", ".png"),
    "WEBP": ("image/webp", ".webp"),
}
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


def sanitize_image(raw):
    """Decode and re-encode one static image, stripping metadata and trailing payloads."""
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(BytesIO(raw)) as source:
            image_format = str(source.format or "").upper()
            media = ALLOWED_IMAGE_TYPES.get(image_format)
            if not media:
                raise ValueError("Only JPEG, PNG and WebP images are supported.")
            if getattr(source, "is_animated", False):
                raise ValueError("Animated images are not supported.")
            source.load()
            image = ImageOps.exif_transpose(source)
            width, height = image.size
            if width <= 0 or height <= 0 or width > MAX_IMAGE_SIDE or height > MAX_IMAGE_SIDE or width * height > MAX_IMAGE_PIXELS:
                raise ValueError("Image dimensions are too large.")

            output = BytesIO()
            if image_format == "JPEG":
                image.convert("RGB").save(output, format="JPEG", quality=90, optimize=True)
            elif image_format == "PNG":
                if image.mode not in {"1", "L", "LA", "P", "RGB", "RGBA"}:
                    image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
                image.save(output, format="PNG", optimize=True)
            else:
                has_alpha = "A" in image.getbands()
                image.convert("RGBA" if has_alpha else "RGB").save(output, format="WEBP", quality=90, method=4)
            return output.getvalue(), image_format, width, height, media


class MediaAssetViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    throttle_scope = "upload_media"
    pagination_class = V2PageNumberPagination

    def _queryset(self, request):
        return MediaAsset.objects.filter(tenant_id__in=user_tenant_ids(request.user)).select_related("tenant").order_by("-created_at", "id")

    def list(self, request):
        tenant_id = request.query_params.get("tenant")
        rows = self._queryset(request)
        if tenant_id:
            rows = rows.filter(tenant_id=tenant_id)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(rows, request, view=self)
        return paginator.get_paginated_response(MediaAssetSerializer(page, many=True).data)

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
            safe_bytes, image_format, width, height, media = sanitize_image(raw)
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning, ValueError) as exc:
            detail = str(exc) if isinstance(exc, ValueError) else "File is not a safe supported image."
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        digest = hashlib.sha256(safe_bytes).hexdigest()
        existing = MediaAsset.objects.filter(tenant_id=tenant_id, sha256=digest).first()
        if existing:
            return Response(MediaAssetSerializer(existing).data, status=status.HTTP_200_OK)

        enforce_media_create(tenant)
        content_type, extension = media
        storage_key = f"tenant-media/{tenant_id}/{digest[:2]}/{digest}-{secrets.token_hex(4)}{extension}"
        saved_key = default_storage.save(storage_key, ContentFile(safe_bytes))
        try:
            asset = MediaAsset.objects.create(
                tenant_id=tenant_id,
                uploaded_by=request.user,
                storage_key=saved_key,
                original_name=Path(uploaded.name or "image").name[:255],
                content_type=content_type,
                byte_size=len(safe_bytes),
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
                metadata={"content_type": content_type, "byte_size": len(safe_bytes), "width": width, "height": height, "sha256": digest, "sanitized": True},
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
        try:
            default_storage.delete(storage_key)
        finally:
            AuditLog.objects.create(tenant=tenant, actor=request.user, action="media.deleted", object_type="media_asset", object_id=asset_id, metadata=metadata)
        return Response(status=status.HTTP_204_NO_CONTENT)
