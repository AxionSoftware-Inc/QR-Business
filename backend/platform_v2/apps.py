from django.apps import AppConfig


class PlatformV2Config(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "platform_v2"
    verbose_name = "QR Business Platform V2"

    def ready(self):
        from . import checks  # noqa: F401
