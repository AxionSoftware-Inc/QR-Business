from collections import defaultdict
from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from .models import AnalyticsDailyRollup, AnalyticsEvent


def _combine_totals(raw_rows, rollup_rows):
    totals = defaultdict(int)
    for row in raw_rows:
        totals[row["event_type"]] += row["count"]
    for row in rollup_rows:
        totals[row["event_type"]] += row["count"] or 0
    return [{"event_type": key, "count": totals[key]} for key in sorted(totals)]


def _combine_daily(raw_rows, rollup_rows):
    totals = defaultdict(int)
    for row in raw_rows:
        totals[(row["day"], row["event_type"])] += row["count"]
    for row in rollup_rows:
        totals[(row["day"], row["event_type"])] += row["count"] or 0
    return [
        {"day": day, "event_type": event_type, "count": totals[(day, event_type)]}
        for day, event_type in sorted(totals)
    ]


def site_analytics(site, *, advanced=False, daily_days=90):
    raw = AnalyticsEvent.objects.filter(site=site)
    rollups = AnalyticsDailyRollup.objects.filter(site=site)

    totals = _combine_totals(
        raw.values("event_type").annotate(count=Count("id")),
        rollups.values("event_type").annotate(count=Sum("count")),
    )

    target_counts = defaultdict(int)
    for row in (
        raw.filter(event_type=AnalyticsEvent.EventType.CTA_CLICK)
        .exclude(target="")
        .values("target")
        .annotate(count=Count("id"))
    ):
        target_counts[row["target"]] += row["count"]
    for row in (
        rollups.filter(event_type=AnalyticsEvent.EventType.CTA_CLICK)
        .exclude(target="")
        .values("target")
        .annotate(count=Sum("count"))
    ):
        target_counts[row["target"]] += row["count"] or 0
    top_targets = [
        {"target": target, "count": count}
        for target, count in sorted(target_counts.items(), key=lambda item: (-item[1], item[0]))[:20]
    ]

    response = {"totals": totals, "top_targets": top_targets}
    if advanced:
        start_day = timezone.localdate() - timedelta(days=max(1, daily_days) - 1)
        raw_daily = (
            raw.filter(occurred_at__date__gte=start_day)
            .annotate(day=TruncDate("occurred_at"))
            .values("day", "event_type")
            .annotate(count=Count("id"))
        )
        rollup_daily = (
            rollups.filter(day__gte=start_day)
            .values("day", "event_type")
            .annotate(count=Sum("count"))
        )
        response["daily"] = _combine_daily(raw_daily, rollup_daily)
    return response


def tenant_analytics(tenant, *, advanced=False, daily_days=360):
    raw = AnalyticsEvent.objects.filter(tenant=tenant)
    rollups = AnalyticsDailyRollup.objects.filter(tenant=tenant)

    totals = _combine_totals(
        raw.values("event_type").annotate(count=Count("id")),
        rollups.values("event_type").annotate(count=Sum("count")),
    )

    site_totals = defaultdict(int)
    for row in raw.values("site_id", "event_type").annotate(count=Count("id")):
        site_totals[(str(row["site_id"]), row["event_type"])] += row["count"]
    for row in rollups.values("site_id", "event_type").annotate(count=Sum("count")):
        site_totals[(str(row["site_id"]), row["event_type"])] += row["count"] or 0

    target_counts = defaultdict(int)
    for row in (
        raw.filter(event_type=AnalyticsEvent.EventType.CTA_CLICK)
        .exclude(target="")
        .values("site_id", "target")
        .annotate(count=Count("id"))
    ):
        target_counts[(str(row["site_id"]), row["target"])] += row["count"]
    for row in (
        rollups.filter(event_type=AnalyticsEvent.EventType.CTA_CLICK)
        .exclude(target="")
        .values("site_id", "target")
        .annotate(count=Sum("count"))
    ):
        target_counts[(str(row["site_id"]), row["target"])] += row["count"] or 0

    per_site = {}
    site_ids = {site_id for site_id, _ in site_totals} | {site_id for site_id, _ in target_counts}
    for site_id in site_ids:
        totals_rows = [
            {"event_type": event_type, "count": count}
            for (row_site, event_type), count in sorted(site_totals.items())
            if row_site == site_id
        ]
        targets = [
            (target, count)
            for (row_site, target), count in target_counts.items()
            if row_site == site_id
        ]
        per_site[site_id] = {
            "totals": totals_rows,
            "top_targets": [
                {"target": target, "count": count}
                for target, count in sorted(targets, key=lambda item: (-item[1], item[0]))[:20]
            ],
        }

    response = {"totals": totals, "sites": per_site}
    if advanced:
        start_day = timezone.localdate() - timedelta(days=max(1, daily_days) - 1)
        raw_daily = (
            raw.filter(occurred_at__date__gte=start_day)
            .annotate(day=TruncDate("occurred_at"))
            .values("day", "event_type")
            .annotate(count=Count("id"))
        )
        rollup_daily = (
            rollups.filter(day__gte=start_day)
            .values("day", "event_type")
            .annotate(count=Sum("count"))
        )
        response["daily"] = _combine_daily(raw_daily, rollup_daily)
    return response
