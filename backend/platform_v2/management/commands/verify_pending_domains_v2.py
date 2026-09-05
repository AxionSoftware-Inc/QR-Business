import dns.exception
import dns.resolver
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from platform_v2.models import AuditLog, Domain, Tenant


class Command(BaseCommand):
    help = "Check pending custom-domain TXT proofs. Dry-run by default; use --apply to persist verified state."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=100, help="Maximum domains to inspect in one run.")
        parser.add_argument("--hostname", default="", help="Inspect only one exact normalized hostname.")
        parser.add_argument("--apply", action="store_true", help="Persist successful verification results.")

    def handle(self, *args, **options):
        limit = options["limit"]
        hostname = str(options["hostname"] or "").strip().lower().rstrip(".")
        apply = options["apply"]
        if limit < 1 or limit > 1000:
            raise CommandError("limit must be between 1 and 1000.")

        rows = Domain.objects.select_related("tenant").filter(
            kind=Domain.Kind.CUSTOM,
            status=Domain.Status.PENDING,
            tenant__status__in=[Tenant.Status.TRIAL, Tenant.Status.ACTIVE],
        ).order_by("created_at", "id")
        if hostname:
            rows = rows.filter(hostname=hostname)
        rows = list(rows[:limit])
        self.stdout.write(f"domains={len(rows)} mode={'APPLY' if apply else 'DRY-RUN'}")

        verified_count = 0
        for domain in rows:
            record_name = f"_qr-business.{domain.hostname}"
            expected = f"qr-business-verification={domain.verification_token}"
            observed = []
            try:
                answers = dns.resolver.resolve(record_name, "TXT", lifetime=4.0)
                observed = [b"".join(answer.strings).decode("utf-8", errors="replace") for answer in answers]
            except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers, dns.exception.Timeout):
                observed = []

            verified = expected in observed
            self.stdout.write(f"{domain.hostname}: {'VERIFIED' if verified else 'pending'}")
            if not verified or not apply:
                continue

            updated = Domain.objects.filter(id=domain.id, status=Domain.Status.PENDING).update(
                status=Domain.Status.VERIFIED,
                verified_at=timezone.now(),
                updated_at=timezone.now(),
            )
            if updated:
                verified_count += 1
                AuditLog.objects.create(
                    tenant=domain.tenant,
                    action="domain.verify_batch",
                    object_type="domain",
                    object_id=str(domain.id),
                    metadata={"hostname": domain.hostname, "verified": True},
                )

        if not apply:
            self.stdout.write(self.style.WARNING("Dry-run only. Re-run with --apply to persist successful proofs."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Verified {verified_count} domain(s)."))
