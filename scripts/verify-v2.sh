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
if grep -R --line-number --exclude-dir='__pycache__' -E 'path\("api/", include\("core\.urls"\)\)' backend/config; then echo "Legacy backend API route detected." >&2; exit 1; fi
if ! grep -q 'showPlatformBranding: boolean' src/modules/sites/types.ts; then echo "PublishedSite branding contract is missing." >&2; exit 1; fi
if ! grep -q 'siteSlug: string' src/modules/sites/types.ts; then echo "PublishedSite canonical site slug is missing." >&2; exit 1; fi
if ! grep -q 'siteSlug: site.slug' src/modules/api/v2-client.ts; then echo "V2 public client does not normalize the canonical site slug." >&2; exit 1; fi
if ! grep -Fq '${baseUrl}/${site.tenantSlug}/${site.siteSlug}' src/modules/sites/public-site-renderer.tsx; then echo "Public QR target is not canonical." >&2; exit 1; fi
if ! grep -q 'permanentRedirect' 'src/app/site/[slug]/page.tsx'; then echo "Legacy public alias is not permanently redirected." >&2; exit 1; fi
if ! grep -q 'show_platform_branding = serializers.SerializerMethodField' backend/platform_v2/serializers.py; then echo "Public branding entitlement is missing." >&2; exit 1; fi
if ! grep -q 'site.showPlatformBranding ?' src/modules/sites/public-site-renderer.tsx; then echo "Renderer branding condition is missing." >&2; exit 1; fi
if ! grep -q 'showPlatformBranding: true' src/modules/guest/guest-site-factory.ts; then echo "Builder preview branding contract missing." >&2; exit 1; fi
if ! grep -q 'enforce_qr_create' backend/platform_v2/serializers.py; then echo "Dynamic QR plan enforcement missing." >&2; exit 1; fi
if ! grep -q 'campaign == "default"' backend/platform_v2/serializers.py; then echo "Default QR idempotence missing." >&2; exit 1; fi
if ! grep -q 'normalize_custom_hostname' backend/platform_v2/serializers.py; then echo "Custom-domain normalization missing." >&2; exit 1; fi
if ! grep -q 'DEFAULT_PAGINATION_CLASS' backend/config/settings.py; then echo "Bounded API pagination missing." >&2; exit 1; fi
if ! grep -q 'V2PageNumberPagination' backend/platform_v2/media_views.py; then echo "Media pagination missing." >&2; exit 1; fi
if ! grep -q 'sanitize_image' backend/platform_v2/media_views.py; then echo "Canonical media sanitization missing." >&2; exit 1; fi
if ! grep -q 'select_for_update' backend/platform_v2/media_views.py || ! grep -q 'select_for_update' backend/platform_v2/serializers.py || ! grep -q 'select_for_update' backend/platform_v2/views.py; then echo "Tenant quota serialization lock missing." >&2; exit 1; fi
if ! grep -q 'tenant_analytics' backend/platform_v2/views.py || ! grep -q 'getV2TenantAnalytics' src/app/guest/dashboard/guest-dashboard-client.tsx; then echo "Batched analytics path missing." >&2; exit 1; fi
if [[ ! -f backend/platform_v2/analytics.py || ! -f backend/platform_v2/migrations/0006_analyticsdailyrollup.py ]]; then echo "Analytics rollup layer missing." >&2; exit 1; fi
if ! grep -q 'AnalyticsDailyRollup' backend/platform_v2/management/commands/prune_analytics_v2.py; then echo "Retention command does not preserve history in rollups." >&2; exit 1; fi
if ! grep -q 'PlatformAdminAuditLogView' backend/platform_v2/urls.py || ! grep -q 'PlatformAdminSiteListView' backend/platform_v2/urls.py; then echo "Operational admin endpoints missing." >&2; exit 1; fi
if [[ ! -f backend/platform_v2/access.py ]]; then echo "Central tenant access policy missing." >&2; exit 1; fi
if grep -q '^def user_tenant_ids\|^def membership_for\|^def can_write\|^def can_admin' backend/platform_v2/views.py; then echo "Access helpers duplicated into views.py." >&2; exit 1; fi
if grep -R --line-number -E 'from \.views import (can_admin|can_write|membership_for|user_tenant_ids)' backend/platform_v2; then echo "Backend access policy leaked into view imports." >&2; exit 1; fi
if [[ ! -f src/app/error.tsx || ! -f src/app/not-found.tsx ]]; then echo "Frontend error boundaries missing." >&2; exit 1; fi
if [[ ! -f src/modules/i18n/catalog.ts ]]; then echo "UI localization catalog missing." >&2; exit 1; fi
if ! grep -q '@/modules/i18n/catalog' src/app/guest/dashboard/guest-dashboard-client.tsx || ! grep -q '@/modules/i18n/catalog' src/app/guest/settings/settings-client.tsx; then echo "Tenant locale not wired into workspace UI." >&2; exit 1; fi
if grep -q '/guest/builder?plan=plus' src/app/pricing/page.tsx; then echo "Pricing Free CTA regressed to legacy Plus template." >&2; exit 1; fi
if ! grep -q 'class V2ApiError' src/modules/api/v2-management-client.ts; then echo "Management API diagnostics missing." >&2; exit 1; fi
if [[ ! -f backend/platform_v2/management/commands/prune_analytics_v2.py || ! -f backend/platform_v2/management/commands/verify_pending_domains_v2.py ]]; then echo "Production maintenance commands missing." >&2; exit 1; fi
if [[ ! -f backend/platform_v2/checks.py ]] || ! grep -q 'REDIS_URL' backend/platform_v2/checks.py || ! grep -q 'S3_BUCKET_NAME' backend/platform_v2/checks.py; then echo "Fail-closed production dependency checks missing." >&2; exit 1; fi
if ! grep -q 'ANALYTICS_TRUST_X_FORWARDED_FOR' backend/platform_v2/services.py || ! grep -q 'ANALYTICS_TRUST_X_FORWARDED_FOR' backend/config/settings.py; then echo "Forwarded analytics IP trust is not explicit." >&2; exit 1; fi

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
  echo "Running rollback-only legacy migration dry-run..."
  python manage.py migrate_legacy_v2
  if [[ "${APPLY_LEGACY_MIGRATION:-False}" == "True" ]]; then
    echo "APPLY_LEGACY_MIGRATION=True: applying migration to the currently configured controlled database."
    python manage.py migrate_legacy_v2 --apply
    python manage.py check_legacy_parity
  else
    echo "Dry-run completed. Applied migration/parity intentionally skipped."
    echo "Only on a controlled rehearsal/final migration database, run:"
    echo "  ENABLE_LEGACY_IMPORT=True APPLY_LEGACY_MIGRATION=True ./scripts/verify-v2.sh"
  fi
else
  echo "Skipped. Set ENABLE_LEGACY_IMPORT=True only against the controlled migration database."
fi

printf '\nV2 verification completed successfully.\n'
