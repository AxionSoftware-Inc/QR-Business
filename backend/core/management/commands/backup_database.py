import os
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


class Command(BaseCommand):
    help = "Create a compressed PostgreSQL backup with pg_dump."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output-dir",
            default=os.getenv("DB_BACKUP_DIR", str(settings.BASE_DIR / "backups")),
            help="Directory where backup files are written.",
        )

    def handle(self, *args, **options):
        database = settings.DATABASES["default"]
        output_dir = Path(options["output_dir"])
        output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = timezone.now().strftime("%Y%m%d-%H%M%S")
        db_name = database["NAME"]
        output_path = output_dir / f"{db_name}-{timestamp}.dump"
        env = os.environ.copy()

        if database.get("PASSWORD"):
            env["PGPASSWORD"] = database["PASSWORD"]

        command = [
            "pg_dump",
            "--format=custom",
            "--no-owner",
            "--no-acl",
            "--username",
            database.get("USER") or "postgres",
            "--file",
            str(output_path),
            db_name,
        ]

        if database.get("HOST"):
            command[4:4] = ["--host", database["HOST"]]

        if database.get("PORT"):
            insert_at = 6 if database.get("HOST") else 4
            command[insert_at:insert_at] = ["--port", str(database["PORT"])]

        try:
            subprocess.run(command, check=True, env=env)
        except FileNotFoundError as exc:
            raise CommandError("pg_dump was not found on PATH.") from exc
        except subprocess.CalledProcessError as exc:
            raise CommandError(f"pg_dump failed with exit code {exc.returncode}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Backup created: {output_path}"))
