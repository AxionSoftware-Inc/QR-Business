import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("platform_v2", "0004_mediaasset"),
    ]

    operations = [
        migrations.CreateModel(
            name="TeamInvitation",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("email", models.EmailField(max_length=254)),
                ("role", models.CharField(choices=[("owner", "Owner"), ("admin", "Admin"), ("editor", "Editor"), ("analyst", "Analyst")], default="editor", max_length=20)),
                ("token_hash", models.CharField(max_length=64, unique=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("accepted", "Accepted"), ("revoked", "Revoked"), ("expired", "Expired")], default="pending", max_length=20)),
                ("expires_at", models.DateTimeField()),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("accepted_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="qr_team_invitations_accepted", to=settings.AUTH_USER_MODEL)),
                ("invited_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="qr_team_invitations_sent", to=settings.AUTH_USER_MODEL)),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="team_invitations", to="platform_v2.tenant")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="teaminvitation", index=models.Index(fields=["tenant", "status"], name="v2_inv_tenant_status_idx")),
        migrations.AddIndex(model_name="teaminvitation", index=models.Index(fields=["email", "status"], name="v2_inv_email_status_idx")),
    ]
