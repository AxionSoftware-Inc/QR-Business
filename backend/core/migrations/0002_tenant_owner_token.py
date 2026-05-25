from django.db import migrations, models
from django.db.models import Q
import secrets


def fill_owner_tokens(apps, schema_editor):
    tenant_model = apps.get_model("core", "Tenant")

    for tenant in tenant_model.objects.filter(Q(owner_token__isnull=True) | Q(owner_token="")):
        token = secrets.token_urlsafe(32)

        while tenant_model.objects.filter(owner_token=token).exists():
            token = secrets.token_urlsafe(32)

        tenant.owner_token = token
        tenant.save(update_fields=["owner_token"])


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="owner_token",
            field=models.CharField(blank=True, max_length=80, null=True),
        ),
        migrations.RunPython(fill_owner_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="tenant",
            name="owner_token",
            field=models.CharField(blank=True, max_length=80, unique=True),
        ),
    ]
