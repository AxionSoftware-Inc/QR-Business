from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from platform_v2.models import AnalyticsEvent, AuditLog


class Command(BaseCommand):
    help = "Prune old raw analytics events. Dry-run by default; use --apply to commit."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=365, help="Retain raw events for this many days (default: 365).")
        parser.add_argument("--batch-size", type=int, default=5000, help="Delete batch size when --apply is used.")
        parser.add_argument("--apply", action="store_true", help="Actually delete matching events.")

    def handle(self, *args, **options):
        days = options["days"]
        batch_size = options["batch_size"]
        apply = options["apply"]
        if days < 30:
            raise CommandError("Refusing retention below 30 days without a code change/review.")
        if batch_size < 100 or batch_size > 50000:
            raise CommandError("batch-size must be between 100 and 50000.")

        cutoff = timezone.now() - timedelta(days=days)
        queryset = AnalyticsEvent.objects.filter(occurred_at__lt=cutoff).order_by("occurred_at", "id")
        count = queryset.count()
        self.stdout.write(f"cutoff={cutoff.isoformat()} matching_events={count} mode={'APPLY' if apply else 'DRY-RUN'}")
        if not apply or count == 0:
            if not apply:
                self.stdout.write(self.style.WARNING("Dry-run only. Re-run with --apply to delete."))
            return

        deleted_total = 0
        while True:
            ids = list(queryset.values_list("id", flat=True)[:batch_size])
            if not ids:
                break
            with transaction.atomic():
                deleted, _ = AnalyticsEvent.objects.filter(id__in=ids).delete()
                deleted_total += deleted

        AuditLog.objects.create(
            action="analytics.retention_prune",
            object_type="analytics_event",
            metadata={"retention_days": days, "deleted": deleted_total, "cutoff": cutoff.isoformat()},
        )
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_total} analytics events."))
