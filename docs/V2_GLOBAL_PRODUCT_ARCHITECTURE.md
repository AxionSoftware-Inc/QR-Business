# QR Business V2 — Global Product Architecture

Status: **V2 foundation / controlled rebuild**  
Branch: `rebuild/global-v2`

## Product thesis

QR Business is not a QR generator. It is a multi-tenant publishing and conversion platform for physical businesses: a durable QR identity opens a fast mobile business site, while the owner can change content, campaigns, domains and calls-to-action without reprinting the QR.

The product must be globally usable, privacy-conscious, operationally observable and safe under hostile multi-tenant conditions.

## Non-negotiable invariants

1. **Tenant isolation is server-side.** No client-supplied tenant id grants access.
2. **Published pages are immutable snapshots.** Editing a draft never changes live content until publish succeeds.
3. **Public rendering never reads draft data.** Only `published_version` is exposed.
4. **QR identity is durable.** Printed QR codes resolve through `/q/<code>/`; destination content may change without changing the printed code.
5. **Analytics is privacy-minimized.** Raw IP addresses are not persisted by the application analytics model.
6. **Secrets are not business data.** Owner credentials/tokens are never stored as tenant profile fields.
7. **Every privileged write is authenticated and tenant-scoped.** Roles: owner, admin, editor, analyst.
8. **Operationally important actions are auditable.** Publish and other sensitive mutations produce audit records.
9. **Production and demo data are separate.** Demo tenants are seed fixtures, not hard-coded runtime backends.
10. **No merge to main without green gates.** Backend checks/migrations/tests and frontend lint/build must pass.

## V2 bounded context

### Identity and access

Django's user model is the authentication principal. `Membership` maps users to tenants with a role. JWT is the API transport credential; refresh tokens are rotated.

### Tenant

A tenant represents a customer/workspace, not a single page. A tenant may own multiple sites, domains and QR campaigns.

### Site publishing

`Site` is stable identity and routing metadata. `SiteVersion` contains content (`title`, `theme`, `blocks`, `seo`).

Editing flow:

1. save draft -> create a new version;
2. `Site.draft_version` points at the newest draft;
3. publish -> copy the selected draft into a new immutable version;
4. atomically switch `Site.published_version`;
5. public API reads only `published_version`.

This makes rollback/version history possible without coupling the public renderer to editor state.

### Domain

`Domain` belongs to a tenant and optionally a specific site. Custom domains begin `pending`, carry a random verification token, and become public only after a separate verification flow proves control.

### Dynamic QR

`QRCode.code` is a random opaque identifier. The public printed URL is platform-controlled: `/q/<code>/`.

A scan:

1. resolves an active QR code;
2. records a minimal `qr_scan` event;
3. redirects to the current published site URL.

Future campaign routing can change without reprinting the QR.

### Analytics

Events are append-only operational data:

- `view`
- `qr_scan`
- `cta_click`

Visitor correlation uses a salted, daily rotating hash derived at request time. Raw IP is not stored in `AnalyticsEvent`. Free-form metadata is size- and type-limited before persistence.

### Audit log

Sensitive authenticated mutations write an `AuditLog` with actor, tenant, object and compact metadata. Audit records are read-only in the admin UI.

## API boundary

Legacy API remains temporarily under `/api/` during migration.

V2 lives under `/api/v2/`:

- `/auth/token/`
- `/auth/token/refresh/`
- `/tenants/`
- `/sites/`
- `/sites/{id}/draft/`
- `/sites/{id}/publish/`
- `/sites/{id}/analytics/`
- `/domains/`
- `/qr-codes/`
- `/public/sites/{tenant_slug}/{site_slug}/`
- `/public/sites/{site_id}/events/`

Dynamic QR redirect is intentionally short and outside the API namespace:

- `/q/{code}/`

## Migration sequence

### Phase 0 — Foundation

- V2 schema and API boundary
- tenant-scoped permissions
- JWT auth
- immutable draft/publish service
- dynamic QR identity
- privacy-safe analytics
- audit log
- CI quality gates

### Phase 1 — Frontend cutover

- replace `src/backend.ts` runtime mocks with typed V2 API client
- session/auth refresh handling
- dashboard uses authenticated tenant-scoped endpoints
- public renderer consumes V2 published contract
- route migration to tenant/site structure with compatibility redirects

### Phase 2 — Builder and media

- version-aware builder autosave
- safe image upload pipeline with MIME sniffing, size/dimension limits and object storage
- asset ownership and garbage collection
- preview tokens that expire and cannot expose another tenant
- block schema registry with per-block validation and migrations

### Phase 3 — Global platform features

- Google/OIDC sign-in and account linking
- invitations and team management
- localized UI/content and timezone-aware reporting
- verified custom domains with automated certificate lifecycle
- billing entitlements independent of UI
- campaign attribution and richer QR analytics
- export/backup/delete workflows

### Phase 4 — Reliability and scale

- Redis rate limits/cache
- background workers for media, email and reports
- idempotency keys for write APIs/webhooks
- OpenTelemetry/Sentry-compatible tracing
- structured logs with request/correlation IDs
- DB backup/restore drills
- CDN caching and purge on publish
- load tests for public render and QR redirect paths

## Legacy code removal criteria

The legacy `core` and `src/backend.ts` can be removed only when all of the following are true:

- V2 data migration has a reversible dry-run report;
- every live legacy public URL has a compatibility route or redirect;
- V2 public renderer is visually regression-tested against retained templates;
- owner/admin flows work solely through authenticated V2 APIs;
- QR generation and redirect tracking are V2-backed;
- analytics parity is validated;
- production backup exists before cutover;
- CI and smoke tests are green after legacy routes are disabled.

## Security baseline still to complete

Foundation does not mean production launch. Before launch we still require:

- OAuth/OIDC account lifecycle and verified email policy;
- refresh-token revocation/blacklist strategy;
- upload MIME sniffing and malware/abuse controls;
- domain ownership verification by DNS/HTTP token;
- CSP and frontend security headers;
- CSRF strategy for any cookie-authenticated endpoints;
- anti-automation controls for analytics and public forms;
- data retention/deletion policy;
- dependency and container scanning;
- secret manager integration;
- threat-model review focused on tenant breakout, SSRF, XSS and custom-domain abuse.

## Definition of global-product quality

A feature is not considered complete because the UI works locally. It is complete only when its authorization model, validation, failure behavior, observability, migration path and automated tests are defined and passing.
