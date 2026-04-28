from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Tenant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=160)),
                ("slug", models.SlugField(max_length=80, unique=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("active", "Active"),
                            ("blocked", "Blocked"),
                            ("archived", "Archived"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                (
                    "plan",
                    models.CharField(
                        choices=[
                            ("oddiy", "Oddiy"),
                            ("plus", "Plus"),
                            ("pro", "Pro"),
                        ],
                        default="oddiy",
                        max_length=20,
                    ),
                ),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Domain",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("hostname", models.CharField(max_length=255, unique=True)),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("subdomain", "Subdomain"),
                            ("custom", "Custom"),
                        ],
                        default="subdomain",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("verified", "Verified"),
                            ("blocked", "Blocked"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="domains",
                        to="core.tenant",
                    ),
                ),
            ],
            options={"ordering": ["hostname"]},
        ),
        migrations.CreateModel(
            name="Site",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=180)),
                ("description", models.TextField(blank=True)),
                (
                    "template_key",
                    models.CharField(
                        choices=[
                            ("oddiy", "Oddiy"),
                            ("plus", "Plus"),
                            ("pro", "Pro"),
                        ],
                        default="oddiy",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("published", "Published"),
                            ("disabled", "Disabled"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("theme", models.JSONField(default=dict)),
                ("blocks", models.JSONField(default=list)),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                (
                    "tenant",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="site",
                        to="core.tenant",
                    ),
                ),
            ],
            options={"ordering": ["title"]},
        ),
    ]

