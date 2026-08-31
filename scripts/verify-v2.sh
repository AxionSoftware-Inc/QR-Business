#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

printf '\n== QR Business V2: frontend ==\n'
cd "$ROOT_DIR"
npm ci
npm run lint
npm run build

printf '\n== QR Business V2: backend ==\n'
cd "$ROOT_DIR/backend"
python -m pip install -r requirements.txt
python manage.py check --deploy
python manage.py makemigrations --check --dry-run
python manage.py migrate --noinput
python manage.py test platform_v2 --verbosity=2

printf '\nV2 verification completed successfully.\n'
