# QR Business V2 Release Gate

`rebuild/global-v2` must not be merged or deployed merely because code review looks good. The release is accepted only after every gate that applies to the intended launch scope has passed on a real environment.

## Gate A — source architecture

Run:

```bash
./scripts/verify-v2.sh
```

Required:

- no `src/backend.ts`;
- no legacy frontend backend client;
- no owner-token/recovery ownership path;
- no dead client-side QR panel/component;
- no legacy Django `/api/` runtime route;
- public `PublishedSite` carries tenant slug, site slug and branding policy;
- legacy one-slug aliases permanently redirect to canonical `/{tenant}/{site}`;
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

Review the dry-run counts. Then:

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
- no legacy `owner_contact` is silently converted into authenticated ownership.

## Gate C — authentication and authorization

Smoke-test with at least two real Google accounts and two tenants.

Acceptance:

- Google credential is verified server-side;
- login works;
- refresh works and rotates the opaque server session;
- replay of a rotated session token fails;
- logout invalidates/revokes the server session;
- Tenant A user cannot list/read/write Tenant B resources;
- editor cannot perform owner-only operations;
- analyst cannot mutate site data;
- team invite can only be accepted by the invited verified email;
- invitation token is visible only at creation time;
- pending invitations reserve plan seats;
- the invited user can consume their own reserved seat;
- last owner cannot be deleted/demoted;
- ownership transfer makes the target owner and demotes the previous owner safely.

## Gate D — Site Studio and publish

Acceptance:

- create workspace;
- create site in selected workspace;
- edit hero/contact/services/gallery/testimonials/highlights/promo/process/FAQ/hours/location;
- reorder/remove list items;
- upload valid images;
- save draft;
- reload builder and recover draft from server;
- publish;
- public page uses the immutable published snapshot;
- editing a later draft does not alter the existing live snapshot before another publish;
- multi-site tenant keeps independent slugs and public routes.

Test Free, Starter, Pro and Business limits separately.

## Gate E — QR

Acceptance:

- QR resource is created for a site;
- plan QR quota is server-enforced;
- deactivating QR codes cannot be used to exceed the total plan quota and later reactivate them;
- QR tenant cannot be changed;
- QR cannot target a site from another tenant;
- PNG download opens/scans;
- SVG download opens/scans;
- `/q/<code>/` records a scan and redirects to the current canonical `/{tenant}/{site}` URL;
- a site-rendered QR encodes the exact tenant+site canonical URL, not the tenant default route;
- disabling or invalid QR returns an appropriate not-found response;
- changing/publishing site content does not require reprinting the dynamic QR.

## Gate F — analytics

Acceptance:

- public view increments view analytics once;
- CTA click records expected target;
- QR redirect records `qr_scan`;
- tenant isolation applies to dashboard analytics;
- raw visitor IP is not persisted by V2 analytics;
- Free plan does not expose paid advanced analytics;
- paid advanced analytics response is available only where entitled.

## Gate G — custom domain and TLS

Use a real test domain.

Acceptance:

- owner/admin can create custom domain only on an entitled plan;
- custom-domain quota is server-enforced;
- URL/path/port/IP input is rejected as hostname input;
- IDNA hostname input is normalized correctly;
- the platform-owned domain/subdomains cannot be claimed as customer custom domains;
- a Domain cannot be moved to another tenant;
- a Domain cannot be retargeted to a foreign-tenant site;
- changing a verified hostname resets verification and rotates the verification token;
- DNS TXT instructions are correct;
- domain remains pending before proof exists;
- verification succeeds after DNS propagation;
- host resolver rejects unverified domains;
- plan downgrade makes an otherwise verified custom domain unroutable when the plan no longer entitles it;
- TLS approval rejects arbitrary/pending domains;
- Caddy obtains a certificate only after approval;
- HTTPS custom domain renders the intended published site;
- wrong tenant/site cannot be routed through the domain endpoint.

## Gate H — media/storage

Against the production-compatible object store:

- JPEG upload succeeds;
- PNG upload succeeds;
- WebP upload succeeds;
- SVG/executable/invalid bytes are rejected;
- oversized bytes/dimensions are rejected;
- plan media quota is enforced;
- duplicate content behaves as intended;
- public media URL remains stable after publish;
- cross-tenant access is impossible;
- authorized deletion removes the object and DB record.

## Gate I — billing and entitlements

Before accepting real money:

- public pricing catalog and authenticated entitlement payload expose the same server-authoritative limits;
- Free/Starter/Pro/Business site, member, media, dynamic-QR and custom-domain quotas match product policy;
- remove-branding is enforced by the public serializer/renderer rather than trusted from the browser;
- provider-specific adapter has its own tests;
- provider event is normalized into the internal billing webhook contract;
- invalid signature cannot mutate plan;
- duplicate event is idempotent;
- active/trial/past_due/canceled mapping is reviewed with the actual provider semantics;
- checkout success is not treated as truth without server webhook confirmation;
- price IDs and environment configuration are documented.

If the provider is not yet connected, paid-plan checkout must remain unavailable rather than simulated.

## Gate J — backup and restore

Before production migration:

```bash
python manage.py backup_v2 --output-dir /secure/off-host/path
python manage.py restore_drill_v2 /secure/off-host/path/<dump> --target-db qr_business_restore_test
```

Acceptance:

- dump exists;
- SHA-256 manifest matches;
- isolated restore succeeds;
- key V2 tables can be queried after restore;
- production DB name is rejected as restore-drill target.

## Gate K — observability and failure behavior

Acceptance:

- request IDs survive reverse proxy;
- backend access logs include request ID/status/latency;
- readiness fails when DB/storage is unavailable;
- 5xx errors are visible in logs/monitoring;
- billing failures are visible;
- media failures are visible;
- custom-domain resolver latency is monitored;
- no secret/token is written to logs.

## Gate L — production security configuration

With `DJANGO_DEBUG=False`:

- strong unique `DJANGO_SECRET_KEY`;
- separate `ANALYTICS_HASH_SALT`;
- strong `BILLING_WEBHOOK_SECRET`;
- correct `ALLOWED_HOSTS`;
- exact CORS origins;
- secure refresh/session cookies;
- HTTPS redirect/HSTS intentionally configured;
- S3 credentials server-only;
- Google client ID restricted correctly;
- CSP matches actual frontend/API/media providers;
- legacy import disabled during normal runtime.

## Gate M — cutover

Immediately before cutover:

1. freeze legacy writes or define the final migration window;
2. create verified backup;
3. run final legacy migration apply;
4. run exact parity check;
5. deploy V2 backend;
6. wait for readiness 200;
7. deploy V2 frontend/edge;
8. smoke-test login → builder → publish → canonical public page → dynamic QR → analytics → custom domain;
9. verify old one-slug URLs 308/redirect to canonical two-segment URLs;
10. monitor errors/latency.

Only after parity is confirmed on the real production migration may `backend/core` be physically removed in a separate cleanup commit.

## Merge rule

Do not merge `rebuild/global-v2` to `main` until Gates A–M that apply to the intended launch scope are complete. A missing external dependency such as payment provider, object store, real DNS domain, production database copy, or executable build environment is a **blocked gate**, not a pass.
