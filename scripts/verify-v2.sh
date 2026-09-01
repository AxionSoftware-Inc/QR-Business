#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

printf '\n== QR Business V2: architecture guard ==\n'
cd "$ROOT_DIR"

for forbidden in \
  "src/backend.ts" \
  "src/modules/api/backend-client.ts" \
  "src/modules/guest/guest-session.ts" \
  "src/modules/tenants/tenant-repository.ts"; do
  if [[ -e "$forbidden" ]]; then
    echo "Forbidden legacy runtime file exists: $forbidden" >&2
    exit 1
  fi
done

if grep -R --line-number --exclude-dir=node_modules --exclude-dir=.next --exclude='verify-v2.sh' \
  -E '@/backend|backend-client|ownerRecoveryCode|ownerToken' src; then
  echo "Legacy frontend runtime reference detected." >&2
  exit 1
fi

if grep -R --line-number --exclude-dir='__pycache__' -E 'path\("api/", include\("core\.urls"\)\)' backend/config; then
  echo "Legacy backend API route detected." >&2
  exit 1
fi

printf '\n== QR Business V2: frontend ==\n'
npm ci
npm run lint
npm run build

printf '\n== QR Business V2: backend ==\n'
cd "$ROOT_DIR/backend"
python -m pip install -r requirements.txt
python -m compileall -q config platform_v2
python manage.py check
python manage.py check --deploy
python manage.py makemigrations --check --dry-run
python manage.py migrate --noinput
python manage.py test platform_v2 --verbosity=2

printf '\n== QR Business V2: optional legacy parity ==\n'
if [[ "${ENABLE_LEGACY_IMPORT:-False}" == "True" ]]; then
  python manage.py migrate_legacy_v2
  python manage.py legacy_parity_check
else
  echo "Skipped. Set ENABLE_LEGACY_IMPORT=True only against the controlled migration database."
fi

printf '\nV2 verification completed successfully.\n'
