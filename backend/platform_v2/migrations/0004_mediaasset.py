import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("platform_v2", "0003_authsession"),
    ]

    operations = [
        migrations.CreateModel(
            name="MediaAsset",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("kind", models.CharField(choices=[("image", "Image")], default="image", max_length=20)),
                ("storage_key", models.CharField(max_length=500, unique=True)),
                ("original_name", models.CharField(blank=True, max_length=255)),
                ("content_type", models.CharField(max_length=100)),
                ("byte_size", models.PositiveBigIntegerField()),
                ("width", models.PositiveIntegerField()),
                ("height", models.PositiveIntegerField()),
                ("sha256", models.CharField(max_length=64)),
                ("alt", models.CharField(blank=True, max_length=240)),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="media_assets", to="platform_v2.tenant")),
                ("uploaded_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="qr_media_assets", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="mediaasset",
            index=models.Index(fields=["tenant", "created_at"], name="platform_v2_tenant__media_created_idx"),
        ),
        migrations.AddIndex(
            model_name="mediaasset",
            index=models.Index(fields=["tenant", "sha256"], name="platform_v2_tenant__media_sha_idx"),
        ),
    ]
