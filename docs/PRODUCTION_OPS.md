# QR Business V2 — Production Operations

This runbook describes the V2-only runtime. Legacy `core` endpoints are not part of production.

## Runtime topology

- Next.js: marketing, account workspace, Site Studio, public renderer and same-origin `/api/v2/*` proxy.
- Django/DRF: `/api/v2/*`, `/q/<code>/`, admin, tenant/site/domain/QR/media/team/billing services.
- PostgreSQL: canonical product data plus durable daily analytics rollups.
- Redis: shared production cache/throttle state across backend instances.
- S3-compatible object storage: production media.
- Caddy (recommended): HTTPS and on-demand TLS for verified custom domains.
- Sentry-compatible DSN (recommended): external error/performance reporting with default PII disabled.

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

Readiness verifies database, object storage and shared cache access:

```bash
curl -fsS https://YOUR_API_HOST/api/v2/ready/
```

Do not put an instance into the load balancer until readiness returns 200 and all three checks are true.

## Production dependency checks

With `DJANGO_DEBUG=False`, V2 deployment checks deliberately fail if Redis, S3 media storage, HTTPS public URL or a separate analytics hash salt are missing:

```bash
python manage.py check --deploy
```

A missing Sentry DSN is a warning rather than a hard error so another approved monitoring system can be used.

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

```bash
cd backend
python manage.py backup_v2 --output-dir /var/backups/qr-business
```

It creates a PostgreSQL custom-format dump and SHA-256 manifest. Keep backups outside the application checkout and replicate them off-host.

Example cron:

```cron
15 3 * * * cd /srv/qr-business/backend && . .venv/bin/activate && python manage.py backup_v2 --output-dir /var/backups/qr-business >> /var/backups/qr-business/backup.log 2>&1
```

## Restore drill

Never test restore against the production database. The target database must already exist and be isolated.

```bash
cd backend
python manage.py restore_drill_v2 --backup /var/backups/qr-business/qr-v2-YYYYMMDD-HHMMSS.dump --target-db qr_business_restore_test
```

After restore, run integrity/read checks against the isolated target before dropping it.

## Tenant business-data export

A workspace can be exported without auth/session/provider secrets:

```bash
cd backend
python manage.py export_tenant_v2 --tenant acme --output /secure/exports/acme.json
```

The command writes JSON plus a `.sha256` manifest. It includes workspace/site versions, domains, QR metadata, media metadata/public URLs and aggregate analytics. It intentionally excludes authentication sessions, identity-provider subjects, verification tokens and billing secrets.

## Analytics retention and rollup

Raw analytics events can grow quickly. The compaction command is dry-run by default:

```bash
cd backend
python manage.py prune_analytics_v2 --days 365
```

Review the cutoff/count, then apply:

```bash
python manage.py prune_analytics_v2 --days 365 --apply
```

The command never compacts a partial day. Each complete old day is aggregated into `AnalyticsDailyRollup` rows and the raw rows are removed in the same transaction. Totals, CTA top-target history and daily charts read raw+rollup data transparently, so long-term product metrics survive raw-event compaction. Retention below 30 days is refused by code.

Recommended scheduler example:

```cron
40 3 * * * cd /srv/qr-business/backend && . .venv/bin/activate && python manage.py prune_analytics_v2 --days 365 --apply >> /var/log/qr-business/analytics-retention.log 2>&1
```

## Custom domains and TLS

A custom domain becomes routable only after DNS TXT verification changes `Domain.status` to `verified`.

Users can verify interactively. Pending domains can also be checked in bounded batches:

```bash
cd backend
python manage.py verify_pending_domains_v2 --limit 100
python manage.py verify_pending_domains_v2 --limit 100 --apply
```

Only exact successful proofs transition to verified. Missing/failed proofs remain pending. This command can be scheduled instead of introducing a mandatory queue for launch.

Recommended Caddy flow is documented in `deploy/Caddyfile.example`. Caddy on-demand TLS must call:

```text
/api/v2/public/tls-allow/?domain=<requested-host>
```

The API returns 2xx only for a verified active custom domain tied to a published site.

## Media storage

Production must set `S3_BUCKET_NAME` and related S3-compatible variables. Accepted JPEG/PNG/WebP uploads are decoded and canonically re-encoded before storage; EXIF/metadata and appended/polyglot bytes are not retained. Animated/invalid/oversized/decompression-bomb inputs are rejected. Media listing is paginated.

Before release, smoke-test upload, public retrieval and deletion against the real object-storage provider.

## Shared Redis cache and throttling

Set `REDIS_URL` in production. DRF throttle state and normal Django cache then use the shared Redis backend, so adding backend replicas does not multiply per-process limits. Development may leave it empty and use LocMem.

Readiness performs a real cache set/get/delete probe. If Redis is configured but unavailable, readiness returns 503.

## Analytics proxy trust

`ANALYTICS_TRUST_X_FORWARDED_FOR=False` is the safe default. Set it to `True` only when Django is reachable exclusively through a trusted reverse proxy that overwrites/sanitizes `X-Forwarded-For`. Otherwise arbitrary clients could spoof visitor identities and distort unique-visitor analytics.

## Billing

The V2 billing endpoint is provider-independent:

```text
POST /api/v2/billing/webhook/
```

It requires `X-QR-Billing-Signature`, an HMAC-SHA256 signature using `BILLING_WEBHOOK_SECRET`. Payment-provider adapters must normalize events into this signed internal contract. Never expose this secret to the browser. Do not enable paid checkout until a real provider adapter, checkout flow and customer-portal flow have been verified end to end.

## Observability

Each Django request receives a request ID and structured access log entry. Preserve `X-Request-ID` through the reverse proxy. Management UI errors surface the request ID so browser reports can be correlated with backend logs.

When `SENTRY_DSN` is configured, Django initializes Sentry with `send_default_pii=False`. The V2 staff console exposes bounded site search/pagination and a read-only forensic audit trail. Monitor at minimum 5xx rate, readiness failures, billing webhook failures, media upload failures, public route latency, QR redirect latency, database connections, Redis health and storage capacity.

## Quota concurrency

Site, custom-domain, dynamic-QR and media quota reservations are serialized with a tenant row lock before count-and-create. This prevents parallel requests from overshooting plan limits while keeping different tenants independent.

## Rollback rule

Database migrations and code rollout must be treated separately. Before deployment:

1. take a verified backup;
2. run migrations;
3. verify readiness;
4. deploy frontend/backend;
5. smoke-test builder, publish, public page, QR redirect, analytics and custom-domain resolver.

If code rollback is needed, do not blindly reverse a destructive schema migration. Restore or forward-fix according to the migration involved.
