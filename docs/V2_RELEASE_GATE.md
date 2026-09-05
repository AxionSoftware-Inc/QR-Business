# QR Business V2 Release Gate

`rebuild/global-v2` must not be merged or deployed merely because code review looks good. The release is accepted only after every gate that applies to the intended launch scope has passed on a real environment.

## Gate A — source architecture

Run:

```bash
./scripts/verify-v2.sh
```

Required:

- no legacy frontend in-memory/backend client or owner-token runtime;
- no dead client-side QR panel/component;
- no legacy Django `/api/` runtime route;
- public `PublishedSite` carries tenant slug, site slug and branding policy;
- legacy one-slug aliases permanently redirect to canonical `/{tenant}/{site}`;
- central backend access policy has no duplicate helper implementation in `views.py`;
- bounded pagination exists for normal resources and media;
- dashboard analytics is tenant-batched rather than per-site N+1;
- staff site browser and forensic audit viewer are bounded/paginated;
- workspace UI uses the uz/en/ru locale catalog;
- frontend error/not-found boundaries exist;
- analytics retention and pending-domain verification maintenance commands exist;
- frontend lint passes;
- frontend production build passes;
- Django compile/check/deployment checks pass;
- no uncommitted migration drift;
- complete `platform_v2` tests pass.

## Gate B — database migration rehearsal

Use a recent copy of the real production database, never the live database for the first rehearsal.

```bash
cd backend
export ENABLE_LEGACY_IMPORT=True
python manage.py migrate
python manage.py test platform_v2.tests.test_legacy_migration --verbosity=2
python manage.py migrate_legacy_v2
```

Review the dry-run counts. The dry-run rolls back, so parity is intentionally **not** run yet. Then on the isolated rehearsal database:

```bash
python manage.py migrate_legacy_v2 --apply
python manage.py check_legacy_parity
```

Acceptance:

- default migration mode performs no persistent V2 writes;
- applied migration is idempotent before native V2 edits exist;
- every migratable legacy tenant exists in V2;
- every legacy site has the exact `main` V2 import snapshot with migration provenance;
- published/draft/disabled state is preserved;
- imported snapshot content matches legacy title, description, template, theme and blocks;
- path-like legacy hostname artifacts are skipped;
- legacy custom-domain trust is not inherited: custom domains require V2 TXT re-verification;
- an already V2-verified custom domain is not downgraded by a harmless importer rerun;
- cross-tenant domain collisions fail closed;
- native V2 site versions created after migration cause a later importer rerun to fail rather than moving live pointers back to legacy content;
- no legacy owner-contact field is silently converted into authenticated ownership.

## Gate C — authentication and authorization

Smoke-test with at least two real Google accounts and two tenants. Existing authentication/RBAC acceptance criteria remain unchanged by the non-auth hardening work.

## Gate D — Site Studio and publish

Acceptance:

- create workspace and site;
- edit all supported content blocks;
- reorder/remove list items;
- upload valid images;
- save draft and recover it from server;
- publish;
- public page uses immutable published snapshot;
- later draft does not alter live content until next publish;
- multi-site tenant keeps independent slugs/routes;
- repeated Studio creation of the `default` campaign QR is idempotent and never creates duplicate default QR resources;
- Free, Starter, Pro and Business limits are tested separately.

## Gate E — QR

Acceptance:

- QR resource is created for a site;
- plan QR quota is server-enforced;
- deactivate/reactivate cannot bypass quota;
- QR cannot move tenant or target a foreign-tenant site;
- PNG and SVG download/scan correctly;
- `/q/<code>/` records scan and redirects to current canonical `/{tenant}/{site}` URL;
- site-rendered QR encodes exact tenant+site URL;
- disabled/invalid QR returns not-found;
- changing published site content does not require reprinting dynamic QR;
- `campaign=default` creation is idempotent/race-safe while non-default campaign QRs remain independent.

## Gate F — analytics and privacy

Acceptance:

- public view, CTA click and QR scan record expected event types;
- tenant isolation applies to analytics;
- raw visitor IP is never persisted;
- spoofed `X-Forwarded-For` is ignored unless the deployment explicitly enables trusted-proxy mode;
- when trusted-proxy mode is enabled, the reverse proxy is proven to overwrite/sanitize forwarded IP headers;
- Free does not expose paid advanced analytics;
- paid advanced analytics is available only where entitled;
- retention dry-run reports old rows without deleting them;
- retention apply is only enabled after the launch retention/history policy is accepted.

## Gate G — custom domain and TLS

Use a real test domain.

Acceptance:

- custom-domain entitlement/quota is server-enforced;
- malformed URL/path/port/IP/platform-owned host input is rejected;
- IDNA is normalized;
- domain cannot move tenant or point at a foreign-tenant site;
- changing verified hostname resets proof and rotates token;
- TXT instructions are correct and pending stays pending without proof;
- interactive and bounded batch verification only mark exact successful proofs verified;
- host resolver/TLS approval reject unverified or unentitled domains;
- plan downgrade disables routing when entitlement is lost;
- Caddy obtains a certificate only after approval;
- HTTPS custom domain renders the intended published site.

## Gate H — media/storage

Against the production-compatible object store:

- JPEG/PNG/WebP uploads succeed;
- SVG/executable/invalid/animated bytes are rejected;
- oversized bytes/dimensions/decompression-bomb inputs are rejected;
- accepted images are decoded and canonically re-encoded before storage;
- EXIF/metadata and appended/polyglot trailing bytes do not survive storage;
- media listing is paginated, not silently truncated;
- plan media quota and dedupe behavior are correct;
- public media URL remains stable after publish;
- cross-tenant access is impossible;
- authorized deletion removes DB row and object as expected.

## Gate I — billing and entitlements

Before accepting real money:

- pricing catalog and entitlement payload expose the same server-authoritative limits;
- Free/Starter/Pro/Business quotas match policy;
- remove-branding is enforced server-side;
- provider-specific adapter has its own tests;
- provider event is normalized into signed internal webhook contract;
- invalid signature cannot mutate plan;
- duplicate event is idempotent;
- provider status mapping is reviewed against real semantics;
- checkout success is not treated as truth without webhook confirmation;
- price IDs/configuration are documented.

If no real provider is connected, paid checkout remains unavailable rather than simulated.

## Gate J — backup and restore

Before production migration:

```bash
python manage.py backup_v2 --output-dir /secure/off-host/path
python manage.py restore_drill_v2 --backup /secure/off-host/path/<dump> --target-db qr_business_restore_test
```

Acceptance:

- dump exists and SHA-256 manifest matches;
- isolated restore succeeds;
- key V2 tables can be queried after restore;
- production DB name is rejected as restore target.

## Gate K — observability and failure behavior

Acceptance:

- request IDs survive reverse proxy;
- access logs include request ID/status/latency;
- readiness probes database, storage and cache and returns 503 if any required dependency is unavailable;
- production uses shared Redis so cache/throttle state is consistent across backend instances;
- 5xx errors are visible in external monitoring or an explicitly accepted equivalent;
- Sentry, when configured, sends no default PII;
- staff audit viewer exposes operational events without secrets/tokens;
- billing/media/domain failures and public/QR latency are observable.

## Gate L — production security configuration

With `DJANGO_DEBUG=False`, `python manage.py check --deploy` must fail closed unless:

- strong unique `DJANGO_SECRET_KEY`;
- separate `ANALYTICS_HASH_SALT`;
- strong billing webhook secret;
- `PUBLIC_WEB_BASE_URL` uses HTTPS;
- shared `REDIS_URL` configured;
- production S3-compatible bucket configured;
- exact allowed hosts/CORS origins;
- secure cookies and intentional HSTS/HTTPS redirect;
- S3 credentials remain server-only;
- CSP matches actual frontend/API/media providers;
- forwarded analytics IP trust is enabled only behind a sanitizing trusted proxy;
- legacy import is disabled during normal runtime.

A missing external error-monitoring DSN is a release warning that requires an explicit operational decision.

## Gate M — cutover

Immediately before cutover:

1. freeze legacy writes or define final migration window;
2. create verified backup;
3. run final legacy migration apply;
4. run exact parity check;
5. deploy V2 backend;
6. wait for readiness 200 including DB/storage/cache;
7. deploy V2 frontend/edge;
8. smoke-test account → builder → publish → canonical page → dynamic QR → analytics → custom domain;
9. verify legacy aliases redirect to canonical route;
10. monitor errors/latency/audit trail.

Only after parity is confirmed on the real production migration may `backend/core` be physically removed in a separate cleanup commit.

## Merge rule

Do not merge `rebuild/global-v2` to `main` until Gates A–M that apply to launch scope are complete. A missing payment provider, object store, Redis, real DNS domain, production database copy or executable environment is a **blocked gate**, not a pass.
