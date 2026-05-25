from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_tenant_owner_token"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="owner_contact",
            field=models.CharField(blank=True, max_length=180),
        ),
    ]
