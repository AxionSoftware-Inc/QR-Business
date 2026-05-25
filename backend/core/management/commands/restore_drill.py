import os
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Run a lightweight restore drill by listing objects inside the latest pg_dump file."

    def add_arguments(self, parser):
        parser.add_argument(
            "--backup-dir",
            default=os.getenv("DB_BACKUP_DIR", str(settings.BASE_DIR / "backups")),
        )

    def handle(self, *args, **options):
        backup_dir = Path(options["backup_dir"])
        backups = sorted(backup_dir.glob("*.dump"), key=lambda path: path.stat().st_mtime)

        if not backups:
            raise CommandError(f"No .dump backups found in {backup_dir}")

        latest = backups[-1]
        command = ["pg_restore", "--list", str(latest)]

        try:
            result = subprocess.run(command, check=True, capture_output=True, text=True)
        except FileNotFoundError as exc:
            raise CommandError("pg_restore was not found on PATH.") from exc
        except subprocess.CalledProcessError as exc:
            raise CommandError(exc.stderr or f"pg_restore failed with {exc.returncode}") from exc

        lines = [line for line in result.stdout.splitlines() if line.strip()]

        if not any("TABLE" in line for line in lines):
            raise CommandError(f"Backup {latest} does not appear to contain tables.")

        self.stdout.write(self.style.SUCCESS(f"Restore drill OK: {latest} ({len(lines)} entries)"))
