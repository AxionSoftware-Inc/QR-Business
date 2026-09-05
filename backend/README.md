# QR Business V2 Backend

Production backend is Django + Django REST Framework + PostgreSQL. The active product app is `platform_v2`.

## Local setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env
python manage.py migrate
python manage.py seed_v2_demo
python manage.py runserver 127.0.0.1:8000
```

Use a local PostgreSQL database configured through `.env`.

## V2 architecture

Core models:

- `Tenant`
- `Membership`
- `Identity`
- `AuthSession`
- `Site`
- `SiteVersion`
- `Domain`
- `QRCode`
- `MediaAsset`
- `AnalyticsEvent`
- `AuditLog`
- `TeamInvitation`

A site has separate immutable draft/published version pointers. Publishing creates a snapshot instead of mutating the live document in place.

## Authentication

Google identity is verified server-side. V2 private APIs use authenticated user membership and tenant-scoped authorization. Browser recovery codes and legacy owner tokens are not trusted as ownership credentials.

Important endpoints:

```text
POST /api/v2/auth/google/
POST /api/v2/auth/refresh/
POST /api/v2/auth/logout/
GET  /api/v2/auth/me/
```

## Sites

```text
GET/POST /api/v2/sites/
GET/PATCH/DELETE /api/v2/sites/<site-id>/
POST /api/v2/sites/<site-id>/draft/
POST /api/v2/sites/<site-id>/publish/
GET  /api/v2/sites/<site-id>/analytics/
```

## Public rendering and analytics

```text
GET  /api/v2/public/sites/<tenant-slug>/
GET  /api/v2/public/sites/<tenant-slug>/<site-slug>/
POST /api/v2/public/sites/<site-id>/events/
```

Only published snapshots are exposed publicly.

## QR

QR records have stable random codes. Scans go through:

```text
GET /q/<code>/
```

The redirect records a QR scan before sending the visitor to the current public site URL. QR images are available as authenticated PNG/SVG downloads from the QR resource endpoint.

## Domains

Custom domains require owner/admin permissions and a plan with custom-domain entitlement. Verification uses a DNS TXT challenge. Only `verified` domains are accepted by the public host resolver and TLS approval endpoint.

```text
GET/POST /api/v2/domains/<domain-id>/verification/
GET      /api/v2/public/resolve-host/?host=example.com
GET      /api/v2/public/tls-allow/?domain=example.com
```

## Media

Uploads accept validated JPEG, PNG and WebP images. Content is inspected with Pillow and constrained by byte size, dimensions and pixel count. Production should use S3-compatible storage/CDN via the environment variables in `.env.example`.

## Team and ownership

Owner/admin users can invite members. Invitation tokens are returned once and only a SHA-256 hash is stored. Acceptance requires the signed-in account email to match the invitation email.

Ownership transfer is explicit; the last owner cannot simply be deleted or demoted accidentally.

## Entitlements

Server-side plan policy is defined in `platform_v2/entitlements.py` for:

- Free
- Starter
- Pro
- Business

Limits are enforced in backend create paths, not only hidden in the UI.

Public plan catalog:

```text
GET /api/v2/plans/
```

## Billing

`POST /api/v2/billing/webhook/` is a provider-independent internal adapter. It requires an HMAC-SHA256 `X-QR-Billing-Signature` using `BILLING_WEBHOOK_SECRET`, and event IDs are idempotent through the audit log.

## Health

```text
GET /api/v2/health/
GET /api/v2/ready/
```

`ready` checks database and storage access.

## Tests and release gate

From repository root:

```bash
./scripts/verify-v2.sh
```

This runs architecture guards, frontend lint/build, Django checks, migration drift checks, migrations and the complete `platform_v2` test suite.

## Legacy import

`backend/core` is not part of the normal production runtime. It is loaded only when:

```env
ENABLE_LEGACY_IMPORT=True
```

Use it only for controlled migration:

```bash
python manage.py migrate_legacy_v2
python manage.py migrate_legacy_v2 --apply
python manage.py check_legacy_parity
```

Do not remove `backend/core` until parity has passed against the real migrated database.

See `docs/PRODUCTION_OPS.md` and `docs/V2_GLOBAL_PRODUCT_ARCHITECTURE.md` for deployment and architecture details.
