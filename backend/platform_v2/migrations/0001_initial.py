# Generated for QR Business V2 foundation.
import django.core.validators
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="Tenant",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=160)),
                ("slug", models.CharField(max_length=63, unique=True, validators=[django.core.validators.RegexValidator(message="Slug must be lowercase ASCII letters, numbers, and hyphens.", regex="^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$\")])),
                ("status", models.CharField(choices=[("trial", "Trial"), ("active", "Active"), ("suspended", "Suspended"), ("archived", "Archived")], default="trial", max_length=20)),
                ("plan", models.CharField(choices=[("free", "Free"), ("starter", "Starter"), ("pro", "Pro"), ("business", "Business")], default="free", max_length=20)),
                ("locale", models.CharField(default="en", max_length=16)),
                ("timezone", models.CharField(default="UTC", max_length=64)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Site",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("slug", models.CharField(max_length=63, validators=[django.core.validators.RegexValidator(message="Slug must be lowercase ASCII letters, numbers, and hyphens.", regex="^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$\")])),
                ("name", models.CharField(max_length=180)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("published", "Published"), ("disabled", "Disabled")], default="draft", max_length=20)),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sites", to="platform_v2.tenant")),
            ],
        ),
        migrations.CreateModel(
            name="SiteVersion",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("version", models.PositiveIntegerField()),
                ("title", models.CharField(max_length=180)),
                ("description", models.TextField(blank=True)),
                ("template_key", models.CharField(default="default", max_length=64)),
                ("theme", models.JSONField(default=dict)),
                ("blocks", models.JSONField(default=list)),
                ("seo", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="qr_site_versions", to=settings.AUTH_USER_MODEL)),
                ("site", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="versions", to="platform_v2.site")),
            ],
            options={"ordering": ["-version"]},
        ),
        migrations.AddField(
            model_name="site",
            name="draft_version",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="draft_for_sites", to="platform_v2.siteversion"),
        ),
        migrations.AddField(
            model_name="site",
            name="published_version",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="published_for_sites", to="platform_v2.siteversion"),
        ),
        migrations.CreateModel(
            name="Membership",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("role", models.CharField(choices=[("owner", "Owner"), ("admin", "Admin"), ("editor", "Editor"), ("analyst", "Analyst")], default="editor", max_length=20)),
                ("is_active", models.BooleanField(default=True)),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="platform_v2.tenant")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="qr_memberships", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="Domain",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("hostname", models.CharField(max_length=253, unique=True)),
                ("kind", models.CharField(choices=[("subdomain", "Subdomain"), ("custom", "Custom")], default="subdomain", max_length=20)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("verified", "Verified"), ("failed", "Failed"), ("disabled", "Disabled")], default="pending", max_length=20)),
                ("verification_token", models.CharField(editable=False, max_length=96, unique=True)),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                ("site", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="domains", to="platform_v2.site")),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="domains", to="platform_v2.tenant")),
            ],
        ),
        migrations.CreateModel(
            name="QRCode",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(editable=False, max_length=32, unique=True)),
                ("label", models.CharField(blank=True, max_length=120)),
                ("campaign", models.CharField(blank=True, max_length=120)),
                ("is_active", models.BooleanField(default=True)),
                ("site", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="qr_codes", to="platform_v2.site")),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="qr_codes", to="platform_v2.tenant")),
            ],
        ),
        migrations.CreateModel(
            name="AnalyticsEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("event_type", models.CharField(choices=[("view", "View"), ("qr_scan", "QR scan"), ("cta_click", "CTA click")], max_length=20)),
                ("target", models.CharField(blank=True, max_length=80)),
                ("visitor_hash", models.CharField(blank=True, max_length=64)),
                ("referrer_domain", models.CharField(blank=True, max_length=253)),
                ("country_code", models.CharField(blank=True, max_length=2)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("occurred_at", models.DateTimeField(auto_now_add=True)),
                ("qr_code", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="analytics_events", to="platform_v2.qrcode")),
                ("site", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="analytics_events", to="platform_v2.site")),
                ("tenant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="analytics_events", to="platform_v2.tenant")),
            ],
            options={"ordering": ["-occurred_at"]},
        ),
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(max_length=120)),
                ("object_type", models.CharField(blank=True, max_length=80)),
                ("object_id", models.CharField(blank=True, max_length=64)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="qr_audit_logs", to=settings.AUTH_USER_MODEL)),
                ("tenant", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to="platform_v2.tenant")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddConstraint(
            model_name="site",
            constraint=models.UniqueConstraint(fields=("tenant", "slug"), name="v2_unique_site_slug_per_tenant"),
        ),
        migrations.AddConstraint(
            model_name="siteversion",
            constraint=models.UniqueConstraint(fields=("site", "version"), name="v2_unique_site_version"),
        ),
        migrations.AddConstraint(
            model_name="membership",
            constraint=models.UniqueConstraint(fields=("tenant", "user"), name="v2_unique_tenant_member"),
        ),
        migrations.AddIndex(model_name="membership", index=models.Index(fields=["user", "is_active"], name="platform_v2_user_id_750028_idx")),
        migrations.AddIndex(model_name="site", index=models.Index(fields=["tenant", "status"], name="platform_v2_tenant__839968_idx")),
        migrations.AddIndex(model_name="site", index=models.Index(fields=["slug", "status"], name="platform_v2_slug_1d9535_idx")),
        migrations.AddIndex(model_name="qrcode", index=models.Index(fields=["tenant", "is_active"], name="platform_v2_tenant__6c7792_idx")),
        migrations.AddIndex(model_name="analyticsevent", index=models.Index(fields=["tenant", "occurred_at"], name="platform_v2_tenant__ee2f03_idx")),
        migrations.AddIndex(model_name="analyticsevent", index=models.Index(fields=["site", "event_type", "occurred_at"], name="platform_v2_site_id_81c84f_idx")),
        migrations.AddIndex(model_name="analyticsevent", index=models.Index(fields=["qr_code", "occurred_at"], name="platform_v2_qr_code_049b37_idx")),
        migrations.AddIndex(model_name="auditlog", index=models.Index(fields=["tenant", "created_at"], name="platform_v2_tenant__45d55e_idx")),
    ]
