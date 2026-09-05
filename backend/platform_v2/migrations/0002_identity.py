import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("platform_v2", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Identity",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider", models.CharField(choices=[("google", "Google")], max_length=32)),
                ("subject", models.CharField(max_length=255)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="qr_identities", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name="identity",
            constraint=models.UniqueConstraint(fields=("provider", "subject"), name="v2_unique_external_identity"),
        ),
        migrations.AddIndex(
            model_name="identity",
            index=models.Index(fields=["user", "provider"], name="platform_v2_user_id_7f18aa_idx"),
        ),
    ]
