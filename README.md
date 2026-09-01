# QR Business

QR Business is a multi-tenant platform for publishing mobile-first business mini-sites and connecting them to stable dynamic QR codes.

The current rebuild lives on `rebuild/global-v2` and replaces the original mock/owner-token architecture with account-based ownership, a real DRF/PostgreSQL backend and immutable publishing.

## Product capabilities

- Google-based account authentication
- Multi-business workspaces
- Tenant-scoped roles: owner, admin, editor, analyst
- Rich Site Studio with live preview
- Immutable draft/published site versions
- Stable dynamic QR records and PNG/SVG downloads
- QR scan, view and CTA analytics
- Validated image uploads with S3-compatible production storage
- Custom-domain DNS verification
- Verified-domain routing and on-demand TLS approval
- Free / Starter / Pro / Business server-side entitlements
- Team invitations and explicit ownership transfer
- Provider-independent signed billing webhook foundation
- Audit logs, request IDs, health/readiness endpoints
- PostgreSQL backup and isolated restore-drill commands

## Stack

Frontend:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

Backend:

- Django
- Django REST Framework
- PostgreSQL
- SimpleJWT/session support
- Pillow image validation
- S3-compatible media storage
- DNS TXT verification

Recommended edge:

- Caddy with on-demand TLS approval for verified custom domains

## Development

Frontend:

```bash
npm install
npm run dev
```

Backend:

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

Default local frontend: `http://127.0.0.1:3000`

Default local backend: `http://127.0.0.1:8000`

## Release verification

Run the complete gate from repository root:

```bash
./scripts/verify-v2.sh
```

It rejects legacy frontend runtime references, then runs frontend lint/build and backend compile/check/migration/test verification.

## Legacy migration

The old Django `core` package is retained only as a temporary import source. It is disabled in the normal runtime and loads only when:

```env
ENABLE_LEGACY_IMPORT=True
```

Migration sequence:

```bash
cd backend
export ENABLE_LEGACY_IMPORT=True
python manage.py migrate_legacy_v2
python manage.py migrate_legacy_v2 --apply
python manage.py check_legacy_parity
```

Do not physically delete `backend/core` until parity passes against the real migrated database.

## Documentation

- [V2 Product Architecture](docs/V2_GLOBAL_PRODUCT_ARCHITECTURE.md)
- [Production Operations](docs/PRODUCTION_OPS.md)
- [Release Gate](docs/V2_RELEASE_GATE.md)

Older architecture documents remain useful as historical context but are not authoritative for the V2 runtime.
