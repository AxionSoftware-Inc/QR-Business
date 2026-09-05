import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("platform_v2", "0005_teaminvitation")]

    operations = [
        migrations.CreateModel(
            name="AnalyticsDailyRollup",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("day", models.DateField()),
                ("event_type", models.CharField(choices=[("view", "View"), ("qr_scan", "QR scan"), ("cta_click", "CTA click")], max_length=20)),
                ("target", models.CharField(blank=True, max_length=80)),
                ("count", models.PositiveBigIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("site", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="analytics_rollups", to="platform_v2.site")),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="analytics_rollups", to="platform_v2.tenant")),
            ],
            options={"ordering": ["-day"]},
        ),
        migrations.AddConstraint(
            model_name="analyticsdailyrollup",
            constraint=models.UniqueConstraint(fields=("tenant", "site", "day", "event_type", "target"), name="v2_unique_analytics_daily_rollup"),
        ),
        migrations.AddIndex(
            model_name="analyticsdailyrollup",
            index=models.Index(fields=["tenant", "day"], name="v2_rollup_tenant_day_idx"),
        ),
        migrations.AddIndex(
            model_name="analyticsdailyrollup",
            index=models.Index(fields=["site", "event_type", "day"], name="v2_rollup_site_event_day_idx"),
        ),
    ]
