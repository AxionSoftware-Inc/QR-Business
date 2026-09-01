# QR Business V2 — Production Operations

This runbook describes the V2-only runtime. Legacy `core` endpoints are not part of production.

## Runtime topology

- Next.js: marketing, account workspace, Site Studio, public renderer and same-origin `/api/v2/*` proxy.
- Django/DRF: `/api/v2/*`, `/q/<code>/`, admin, auth, tenant/site/domain/QR/media/team/billing services.
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

The gate checks:

1. forbidden legacy frontend files/references are absent;
2. legacy `/api/` backend route is absent;
3. clean `npm ci`, lint and production Next build;
4. Python compilation;
5. Django system/deployment checks;
6. migration drift;
7. migrations;
8. complete `platform_v2` test suite.

## Legacy migration rehearsal

Only when importing an existing legacy database:

```bash
cd backend
export ENABLE_LEGACY_IMPORT=True
python manage.py migrate
python manage.py migrate_legacy_v2
python manage.py check_legacy_parity
```

`migrate_legacy_v2` is dry-run by default. Review its counters first. Apply only after the dry-run is understood:

```bash
python manage.py migrate_legacy_v2 --apply
python manage.py check_legacy_parity
```

Do not delete `backend/core` until parity passes on a copy of the real database and again after the production migration.

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

Never test restore against the production database. The V2 drill rejects the configured production DB name as a target.

```bash
cd backend
python manage.py restore_drill_v2 /var/backups/qr-business/qr-v2-YYYYMMDD-HHMMSS.dump --target-db qr_business_restore_test
```

After restore, run integrity/read checks against the isolated target before dropping it.

## Custom domains and TLS

A custom domain becomes routable only after DNS TXT verification changes `Domain.status` to `verified`.

Recommended Caddy flow is documented in `deploy/Caddyfile.example`. Caddy on-demand TLS must call:

```text
/api/v2/public/tls-allow/?domain=<requested-host>
```

The API returns 2xx only for a verified active custom domain tied to a published site. This prevents arbitrary certificate issuance.

## Media storage

Production should set `S3_BUCKET_NAME` and related S3-compatible variables. Published snapshots should reference stable public/CDN media URLs, not expiring signed URLs.

Before release, smoke-test:

- JPEG upload;
- PNG upload;
- WebP upload;
- invalid/SVG rejection;
- media retrieval from a public published site;
- deletion by an authorized editor;
- cross-tenant media isolation.

## Billing

The V2 billing endpoint is provider-independent:

```text
POST /api/v2/billing/webhook/
```

It requires `X-QR-Billing-Signature`, an HMAC-SHA256 signature using `BILLING_WEBHOOK_SECRET`. Payment-provider adapters must normalize events into this signed internal contract. Never expose this shared secret to the browser.

## Observability

Each Django request receives a request ID and structured access log entry. Preserve `X-Request-ID` through the reverse proxy and include it in incident reports.

Monitor at minimum:

- 5xx rate;
- readiness failures;
- auth failures/spikes;
- billing webhook failures;
- media upload failures;
- public route latency;
- QR redirect latency;
- database connections/storage capacity.

## Rollback rule

Database migrations and code rollout must be treated separately. Before deployment:

1. take a verified backup;
2. run migrations;
3. verify readiness;
4. deploy frontend/backend;
5. smoke-test auth, builder, publish, public page, QR redirect, analytics and custom-domain resolver.

If code rollback is needed, do not blindly reverse a destructive schema migration. Restore or forward-fix according to the migration involved.
