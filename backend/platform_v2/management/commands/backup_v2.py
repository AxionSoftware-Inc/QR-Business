import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create a pg_dump custom-format backup plus SHA-256 manifest."

    def add_arguments(self, parser):
        parser.add_argument("--output-dir", default="backups")

    def handle(self, *args, **options):
        db = settings.DATABASES["default"]
        output_dir = Path(options["output_dir"]).expanduser().resolve()
        output_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        dump_path = output_dir / f"qr-business-v2-{stamp}.dump"
        manifest_path = output_dir / f"qr-business-v2-{stamp}.json"

        env = os.environ.copy()
        if db.get("PASSWORD"):
            env["PGPASSWORD"] = str(db["PASSWORD"])
        command = [
            os.getenv("PG_DUMP_BIN", "pg_dump"),
            "--format=custom", "--no-owner", "--no-acl", "--file", str(dump_path),
            "--host", str(db.get("HOST") or "127.0.0.1"), "--port", str(db.get("PORT") or "5432"),
            "--username", str(db.get("USER") or "postgres"), str(db.get("NAME") or "QR"),
        ]
        try:
            subprocess.run(command, env=env, check=True)
        except (OSError, subprocess.CalledProcessError) as exc:
            dump_path.unlink(missing_ok=True)
            raise CommandError(f"pg_dump failed: {exc}") from exc

        digest = hashlib.sha256(dump_path.read_bytes()).hexdigest()
        manifest = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "database": str(db.get("NAME")),
            "format": "postgres-custom",
            "file": dump_path.name,
            "bytes": dump_path.stat().st_size,
            "sha256": digest,
            "restore_command": "python manage.py restore_drill_v2 --backup <dump> --target-db <isolated_test_db>",
        }
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"backup={dump_path}"))
        self.stdout.write(self.style.SUCCESS(f"manifest={manifest_path}"))
