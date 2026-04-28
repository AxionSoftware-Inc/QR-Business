# Domain Modules

Business logic lives here. Routes and React pages should stay thin and call these modules instead of embedding rules directly in UI files.

Modules planned for this platform:

- `auth` - users, roles, session guards
- `tenants` - businesses, slugs, domains, tenant resolution
- `sites` - public site versions, block schemas, renderer contracts
- `builder` - draft editing, preview, publish flow
- `media` - uploads, storage adapter, asset metadata
- `qr` - QR target URLs, image generation, downloadable assets
- `analytics` - site views, QR scans, CTA click events
- `billing` - plans, subscription status, payment provider integration

