# QR Business V2 — Production Operations

This runbook describes the V2-only runtime. Legacy `core` endpoints are not part of production.

## Runtime topology

- Next.js: marketing, account workspace, Site Studio, public renderer and same-origin `/api/v2/*` proxy.
- Django/DRF: `/api/v2/*`, `/q/<code>/`, admin, tenant/site/domain/QR/media/team/billing services.
- PostgreSQL: canonical product data.
- S3-compatible object storage: production media.
- Caddy (recommended): HTTPS and on-demand TLS for verified custom domains.

`ENABLE_LEGACY_IMPORT` must remain `False` in normal production. Enable it only during a controlled migration rehearsal against the legacy database.

## Health and readiness

Liveness:

```bash
curl -fsS https://YOUR_API_HOST/api/v2/health/
```

Expected:

```json
{"status":"ok","api":"v2"}
```

Readiness verifies database and storage access:

```bash
curl -fsS https://YOUR_API_HOST/api/v2/ready/
```

Do not put an instance into the load balancer until readiness returns 200.

## Release verification

From repository root:

```bash
./scripts/verify-v2.sh
```

The gate checks architecture invariants, clean frontend install/lint/build, Python compilation, Django system/deployment checks, migration drift, migrations and the complete `platform_v2` test suite.

## Legacy migration rehearsal

Only when importing an existing legacy database:

```bash
cd backend
export ENABLE_LEGACY_IMPORT=True
python manage.py migrate
python manage.py migrate_legacy_v2
```

`migrate_legacy_v2` is dry-run/rollback by default. Review its counters first. **Do not run parity after the rollback-only dry-run.** When the dry-run is understood, apply into the isolated rehearsal database and then run parity:

```bash
python manage.py migrate_legacy_v2 --apply
python manage.py check_legacy_parity
```

Repeat the same sequence on the final controlled migration. Do not delete `backend/core` until parity passes on a recent copy of the real database and again after the final applied migration.

## Backup

Use the V2 backup command:

```bash
cd backend
python manage.py backup_v2 --output-dir /var/backups/qr-business
```

It creates a PostgreSQL custom-format dump and SHA-256 manifest.

Example cron:

```cron
15 3 * * * cd /srv/qr-business/backend && . .venv/bin/activate && python manage.py backup_v2 --output-dir /var/backups/qr-business >> /var/backups/qr-business/backup.log 2>&1
```

Keep backups outside the application checkout and replicate them off-host.

## Restore drill

Never test restore against the production database. The V2 drill rejects the configured production DB name as a target. The target database must already exist and be isolated.

```bash
cd backend
python manage.py restore_drill_v2 --backup /var/backups/qr-business/qr-v2-YYYYMMDD-HHMMSS.dump --target-db qr_business_restore_test
```

After restore, run integrity/read checks against the isolated target before dropping it.

## Analytics retention

Raw analytics events can grow quickly. The retention command is deliberately dry-run by default:

```bash
cd backend
python manage.py prune_analytics_v2 --days 365
```

Review the reported cutoff/count before applying:

```bash
python manage.py prune_analytics_v2 --days 365 --apply
```

The command refuses retention windows below 30 days and deletes in bounded batches. Schedule it only after the product's analytics-retention policy is approved. If long-term historical analytics must be retained beyond the raw-event window, add/enable an aggregate warehouse or rollup pipeline before applying destructive pruning.

## Custom domains and TLS

A custom domain becomes routable only after DNS TXT verification changes `Domain.status` to `verified`.

Users can verify interactively through the API/UI. Pending domains can also be checked in bounded batches. The maintenance command is dry-run by default:

```bash
cd backend
python manage.py verify_pending_domains_v2 --limit 100
python manage.py verify_pending_domains_v2 --limit 100 --apply
```

It writes only successful pending→verified transitions; failed/missing TXT proofs remain pending. Run it from a scheduler if automatic retries are desired.

Recommended Caddy flow is documented in `deploy/Caddyfile.example`. Caddy on-demand TLS must call:

```text
/api/v2/public/tls-allow/?domain=<requested-host>
```

The API returns 2xx only for a verified active custom domain tied to a published site. This prevents arbitrary certificate issuance.

## Media storage

Production should set `S3_BUCKET_NAME` and related S3-compatible variables. Published snapshots should reference stable public/CDN media URLs, not expiring signed URLs.

Before release, smoke-test JPEG/PNG/WebP upload, invalid/SVG rejection, public retrieval, deletion and cross-tenant isolation against the real object-storage provider.

## Billing

The V2 billing endpoint is provider-independent:

```text
POST /api/v2/billing/webhook/
```

It requires `X-QR-Billing-Signature`, an HMAC-SHA256 signature using `BILLING_WEBHOOK_SECRET`. Payment-provider adapters must normalize events into this signed internal contract. Never expose this shared secret to the browser. Do not enable paid checkout until a real provider adapter, checkout flow and customer-portal flow have been verified end to end.

## Observability

Each Django request receives a request ID and structured access log entry. Preserve `X-Request-ID` through the reverse proxy and include it in incident reports.

The V2 staff console exposes bounded site search/pagination and a read-only forensic audit trail. Monitor at minimum 5xx rate, readiness failures, billing webhook failures, media upload failures, public route latency, QR redirect latency, database connections and storage capacity.

## Rollback rule

Database migrations and code rollout must be treated separately. Before deployment:

1. take a verified backup;
2. run migrations;
3. verify readiness;
4. deploy frontend/backend;
5. smoke-test builder, publish, public page, QR redirect, analytics and custom-domain resolver.

If code rollback is needed, do not blindly reverse a destructive schema migration. Restore or forward-fix according to the migration involved.
