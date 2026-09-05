from collections import defaultdict
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from platform_v2.models import AnalyticsDailyRollup, AnalyticsEvent, AuditLog


class Command(BaseCommand):
    help = "Compact old raw analytics into durable daily rollups. Dry-run by default."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=365, help="Retain raw events for this many days (default: 365).")
        parser.add_argument("--apply", action="store_true", help="Persist rollups and remove compacted raw events.")

    def handle(self, *args, **options):
        days = options["days"]
        apply = options["apply"]
        if days < 30:
            raise CommandError("Refusing retention below 30 days without a code change/review.")

        cutoff = timezone.now() - timedelta(days=days)
        # Never compact a partial day. This makes one day an idempotent unit.
        cutoff = cutoff.replace(hour=0, minute=0, second=0, microsecond=0)
        eligible = AnalyticsEvent.objects.filter(occurred_at__lt=cutoff)
        event_count = eligible.count()
        days_to_compact = list(
            eligible.annotate(day=TruncDate("occurred_at"))
            .values_list("day", flat=True)
            .distinct()
            .order_by("day")
        )
        self.stdout.write(
            f"cutoff={cutoff.isoformat()} matching_events={event_count} days={len(days_to_compact)} mode={'APPLY' if apply else 'DRY-RUN'}"
        )
        if not apply:
            self.stdout.write(self.style.WARNING("Dry-run only. Re-run with --apply to roll up and compact complete old days."))
            return
        if not event_count:
            return

        compacted = 0
        rollup_rows = 0
        for day in days_to_compact:
            day_events = AnalyticsEvent.objects.filter(occurred_at__date=day)
            grouped = (
                day_events.values("tenant_id", "site_id", "event_type", "target")
                .annotate(row_count=Count("id"))
                .order_by()
            )
            merged = defaultdict(int)
            for row in grouped.iterator(chunk_size=2000):
                target = row["target"] if row["event_type"] == AnalyticsEvent.EventType.CTA_CLICK else ""
                key = (row["tenant_id"], row["site_id"], row["event_type"], target)
                merged[key] += row["row_count"]

            with transaction.atomic():
                # Exact replacement count makes a retry safe if a previous process
                # wrote rollups but failed before committing the raw-row deletion.
                for (tenant_id, site_id, event_type, target), count in merged.items():
                    AnalyticsDailyRollup.objects.update_or_create(
                        tenant_id=tenant_id,
                        site_id=site_id,
                        day=day,
                        event_type=event_type,
                        target=target,
                        defaults={"count": count},
                    )
                    rollup_rows += 1
                deleted, _ = day_events.delete()
                compacted += deleted

        AuditLog.objects.create(
            action="analytics.retention_compact",
            object_type="analytics_event",
            metadata={
                "retention_days": days,
                "raw_events_compacted": compacted,
                "rollup_rows_written": rollup_rows,
                "cutoff": cutoff.isoformat(),
            },
        )
        self.stdout.write(self.style.SUCCESS(f"Compacted {compacted} raw events into {rollup_rows} daily rollup writes."))
