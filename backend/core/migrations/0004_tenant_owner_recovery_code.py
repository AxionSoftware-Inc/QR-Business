import secrets

from django.db import migrations, models


def fill_recovery_codes(apps, schema_editor):
    Tenant = apps.get_model("core", "Tenant")

    for tenant in Tenant.objects.filter(owner_recovery_code=""):
        tenant.owner_recovery_code = secrets.token_hex(3).upper()
        tenant.save(update_fields=["owner_recovery_code"])


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0003_tenant_owner_contact"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="owner_recovery_code",
            field=models.CharField(blank=True, max_length=12),
        ),
        migrations.RunPython(fill_recovery_codes, migrations.RunPython.noop),
    ]
