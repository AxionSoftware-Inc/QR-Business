#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

printf '\n== QR Business V2: architecture guard ==\n'
cd "$ROOT_DIR"

for forbidden in \
  "src/backend.ts" \
  "src/modules/api/backend-client.ts" \
  "src/modules/guest/guest-session.ts" \
  "src/modules/tenants/tenant-repository.ts" \
  "src/shared/ui/site-qr-panel.tsx" \
  "src/shared/ui/qr-code.tsx"; do
  if [[ -e "$forbidden" ]]; then
    echo "Forbidden legacy/dead runtime file exists: $forbidden" >&2
    exit 1
  fi
done

if grep -R --line-number --exclude-dir=node_modules --exclude-dir=.next --exclude='verify-v2.sh' -E '@/backend|backend-client|ownerRecoveryCode|ownerToken' src; then
  echo "Legacy frontend runtime reference detected." >&2
  exit 1
fi
if grep -R --line-number --exclude-dir='__pycache__' -E 'path\("api/", include\("core\.urls"\)\)' backend/config; then
  echo "Legacy backend API route detected." >&2
  exit 1
fi
if ! grep -q 'showPlatformBranding: boolean' src/modules/sites/types.ts; then echo "PublishedSite branding contract is missing." >&2; exit 1; fi
if ! grep -q 'siteSlug: string' src/modules/sites/types.ts; then echo "PublishedSite canonical site slug is missing." >&2; exit 1; fi
if ! grep -q 'siteSlug: site.slug' src/modules/api/v2-client.ts; then echo "V2 public client does not normalize the canonical site slug." >&2; exit 1; fi
if ! grep -Fq '${baseUrl}/${site.tenantSlug}/${site.siteSlug}' src/modules/sites/public-site-renderer.tsx; then echo "Public QR target is not the canonical tenant/site URL." >&2; exit 1; fi
if ! grep -q 'permanentRedirect' 'src/app/site/[slug]/page.tsx'; then echo "Legacy one-slug public alias is not permanently redirected to canonical V2 routing." >&2; exit 1; fi
if ! grep -q 'show_platform_branding = serializers.SerializerMethodField' backend/platform_v2/serializers.py; then echo "Public branding entitlement is missing from backend serializer." >&2; exit 1; fi
if ! grep -q 'site.showPlatformBranding ?' src/modules/sites/public-site-renderer.tsx; then echo "Public renderer does not condition platform branding on entitlement." >&2; exit 1; fi
if ! grep -q 'showPlatformBranding: true' src/modules/guest/guest-site-factory.ts; then echo "Builder preview is not aligned with PublishedSite branding contract." >&2; exit 1; fi
if ! grep -q 'enforce_qr_create' backend/platform_v2/serializers.py; then echo "Dynamic QR plan enforcement is missing." >&2; exit 1; fi
if ! grep -q 'normalize_custom_hostname' backend/platform_v2/serializers.py; then echo "Custom-domain normalization/validation is missing." >&2; exit 1; fi
if ! grep -q 'DEFAULT_PAGINATION_CLASS' backend/config/settings.py; then echo "Bounded API pagination is missing." >&2; exit 1; fi
if ! grep -q 'url_path="analytics"' backend/platform_v2/views.py; then echo "Tenant batch analytics endpoint is missing." >&2; exit 1; fi
if ! grep -q 'getV2TenantAnalytics' src/app/guest/dashboard/guest-dashboard-client.tsx; then echo "Dashboard regressed to per-site analytics requests." >&2; exit 1; fi
if ! grep -q 'PlatformAdminOverviewView' backend/platform_v2/urls.py; then echo "Scalable platform admin overview endpoint is missing." >&2; exit 1; fi
if [[ ! -f backend/platform_v2/access.py ]]; then echo "Central tenant access policy is missing." >&2; exit 1; fi
if grep -R --line-number --exclude='views.py' -E 'from \.views import (can_admin|can_write|membership_for|user_tenant_ids)' backend/platform_v2; then echo "Backend access policy leaked back into views.py imports." >&2; exit 1; fi
if [[ ! -f src/app/error.tsx || ! -f src/app/not-found.tsx ]]; then echo "Frontend error/not-found boundaries are missing." >&2; exit 1; fi
if [[ ! -f src/modules/i18n/catalog.ts ]]; then echo "UI localization catalog is missing." >&2; exit 1; fi

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

printf '\n== QR Business V2: optional legacy migration rehearsal ==\n'
if [[ "${ENABLE_LEGACY_IMPORT:-False}" == "True" ]]; then
  python manage.py test platform_v2.tests.test_legacy_migration --verbosity=2
  python manage.py migrate_legacy_v2
  if [[ "${VERIFY_LEGACY_PARITY:-False}" == "True" ]]; then
    python manage.py check_legacy_parity
  else
    echo "Dry-run completed. Parity is intentionally skipped until an applied migration exists."
    echo "After: python manage.py migrate_legacy_v2 --apply"
    echo "Run:   VERIFY_LEGACY_PARITY=True ./scripts/verify-v2.sh"
  fi
else
  echo "Skipped. Set ENABLE_LEGACY_IMPORT=True only against the controlled migration database."
fi

printf '\nV2 verification completed successfully.\n'
