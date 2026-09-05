import os
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Restore a backup into an EXISTING isolated PostgreSQL database and verify core V2 tables."

    def add_arguments(self, parser):
        parser.add_argument("--backup", required=True)
        parser.add_argument("--target-db", required=True)

    def handle(self, *args, **options):
        backup = Path(options["backup"]).expanduser().resolve()
        target_db = options["target_db"].strip()
        configured_db = str(settings.DATABASES["default"].get("NAME") or "")
        if not backup.is_file():
            raise CommandError("Backup file does not exist.")
        if not target_db or target_db == configured_db:
            raise CommandError("target-db must be an existing isolated database and must not equal the configured production database.")
        if not target_db.replace("_", "").replace("-", "").isalnum():
            raise CommandError("Unsafe target database name.")

        db = settings.DATABASES["default"]
        env = os.environ.copy()
        if db.get("PASSWORD"):
            env["PGPASSWORD"] = str(db["PASSWORD"])
        common = ["--host", str(db.get("HOST") or "127.0.0.1"), "--port", str(db.get("PORT") or "5432"), "--username", str(db.get("USER") or "postgres")]
        restore = [os.getenv("PG_RESTORE_BIN", "pg_restore"), "--clean", "--if-exists", "--no-owner", "--no-acl", "--exit-on-error", *common, "--dbname", target_db, str(backup)]
        try:
            subprocess.run(restore, env=env, check=True)
            query = "SELECT count(*) FROM platform_v2_tenant; SELECT count(*) FROM platform_v2_site; SELECT count(*) FROM platform_v2_siteversion;"
            subprocess.run([os.getenv("PSQL_BIN", "psql"), *common, "--dbname", target_db, "--set", "ON_ERROR_STOP=1", "--command", query], env=env, check=True)
        except (OSError, subprocess.CalledProcessError) as exc:
            raise CommandError(f"Restore drill failed: {exc}") from exc
        self.stdout.write(self.style.SUCCESS(f"Restore drill PASS on isolated database {target_db}."))
