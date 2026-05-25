from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0004_tenant_owner_recovery_code"),
    ]

    operations = [
        migrations.CreateModel(
            name="SiteEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("event_type", models.CharField(choices=[("view", "View"), ("click", "Click")], max_length=20)),
                ("target", models.CharField(blank=True, max_length=80)),
                ("user_agent", models.TextField(blank=True)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("site", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="core.site")),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["site", "event_type", "created_at"], name="core_siteev_site_id_28a21d_idx"),
                    models.Index(fields=["site", "target", "created_at"], name="core_siteev_site_id_6e439b_idx"),
                ],
            },
        ),
    ]
