# Technical Work Plan

## 0. Boshlang'ich Qarorlar

Loyiha Next.js bilan boshlangan. Uni bitta katta monolitga aylantirmaslik uchun kodni boshidan domain-modullarga ajratamiz.

Tanlangan boshlang'ich stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- ORM: Prisma yoki Drizzle
- Auth: Auth.js yoki Supabase Auth
- Storage: Supabase Storage yoki S3-compatible provider
- QR: `qrcode`
- Deploy: Vercel

Hozircha tavsiya: PostgreSQL + Prisma + Auth.js. Agar tezroq MVP kerak bo'lsa, Supabase Auth + Supabase DB + Supabase Storage ham yaxshi variant.

## 1. Repo Strukturasi

Yaratiladigan struktura:

```text
src/
  app/
    (platform)/
      page.tsx
    (dashboard)/
      dashboard/
    (admin)/
      admin/
    (public)/
      site/
    api/
  modules/
    auth/
    tenants/
    sites/
    builder/
    media/
    qr/
    analytics/
    billing/
  shared/
    config/
    db/
    validation/
    ui/
    utils/
prisma/
  schema.prisma
docs/
```

Muhim qoida: route fayllari yupqa bo'ladi, biznes logika `modules/*` ichida turadi.

## 2. Environment Config

Kerakli `.env` qiymatlar:

```env
APP_URL=http://localhost:3000
ROOT_DOMAIN=localhost:3000
DATABASE_URL=
AUTH_SECRET=
STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
```

Production:

```env
APP_URL=https://bm.com
ROOT_DOMAIN=bm.com
```

## 3. Database Ishlari

### 3.1 ORM o'rnatish

Agar Prisma tanlansa:

```bash
npm install prisma @prisma/client
npx prisma init
```

### 3.2 Birinchi schema

Modellar:

- `User`
- `Tenant`
- `Domain`
- `Site`
- `SiteVersion`
- `MediaAsset`
- `QrCode`
- `AnalyticsEvent`
- `Subscription`

### 3.3 Migration

```bash
npx prisma migrate dev --name init
```

## 4. Host Resolver

Fayllar:

```text
src/modules/tenants/host-resolver.ts
src/middleware.ts
```

Vazifalar:

- `Host` headerdan hostname olish
- root domainni platform routega qoldirish
- subdomainni tenant slug sifatida aniqlash
- custom domainni `domains` jadvalidan tekshirish
- tenant topilmasa 404 routega o'tkazish

Development fallback:

- `http://localhost:3000/site/ali`
- yoki hosts file orqali `ali.localhost`

## 5. Public Site Renderer

Fayllar:

```text
src/modules/sites/block-schema.ts
src/modules/sites/site-repository.ts
src/modules/sites/public-site-renderer.tsx
src/modules/sites/blocks/
  hero.tsx
  contact-buttons.tsx
  services.tsx
  gallery.tsx
  location.tsx
  working-hours.tsx
```

Ishlar:

- block type union yaratish
- har block uchun renderer yozish
- disabled blocklarni chizmaslik
- unknown blocklarni ignore qilish
- published version bo'lmasa 404 ko'rsatish

## 6. Admin MVP

Admin panel birinchi versiyada eng muhim qism, chunki xizmatni qo'lda sotib boshlash mumkin.

Route:

```text
/admin
/admin/tenants
/admin/tenants/new
/admin/tenants/[tenantId]
/admin/tenants/[tenantId]/site
/admin/tenants/[tenantId]/qr
```

Funksiyalar:

- tenant yaratish
- slug/subdomain uniqueness tekshirish
- site draft yaratish
- block data form orqali kiritish
- publish qilish
- QR yaratish va yuklab olish

## 7. Owner Dashboard

Admin MVPdan keyin qo'shiladi.

Route:

```text
/dashboard
/dashboard/sites/[siteId]
/dashboard/sites/[siteId]/preview
/dashboard/sites/[siteId]/settings
```

Funksiyalar:

- o'z biznesini ko'rish
- ma'lumotlarni tahrirlash
- preview
- publish request yoki direct publish
- QR yuklab olish

## 8. Builder

MVP builder form-based bo'ladi.

Block controls:

- hero: text, logo, cover image
- contacts: phone, telegram, instagram, whatsapp, website
- services: repeatable list
- gallery: image upload/order
- location: address, map link
- working hours: weekday schedule

Keyinroq:

- drag-and-drop order
- template variants
- color tokens
- font pairings
- section spacing presets

## 9. QR Generation

Fayllar:

```text
src/modules/qr/qr-service.ts
src/modules/qr/qr-image.ts
src/modules/qr/qr-repository.ts
```

MVP:

- target URL yaratish
- QR PNG buffer generatsiya qilish
- storagega upload qilish
- `qr_codes` jadvaliga yozish

Keyingi bosqich:

- dynamic QR redirect route: `/q/[code]`
- scan event yozish
- QR design templates
- PDF A4 print sheet

## 10. Media Upload

Fayllar:

```text
src/modules/media/media-service.ts
src/modules/media/storage-adapter.ts
src/app/api/media/upload/route.ts
```

Talablar:

- image type whitelist: jpg, png, webp
- size limit
- tenant-scoped storage key
- public URL yoki signed URL
- alt text

Storage key namunasi:

```text
tenants/{tenantId}/media/{assetId}.webp
```

## 11. Analytics

MVP eventlar:

- `site_view`
- `qr_scan`
- `contact_click`
- `social_click`
- `map_click`

Fayllar:

```text
src/modules/analytics/analytics-service.ts
src/app/api/events/route.ts
```

Muhim:

- event yozish public sahifani sekinlashtirmasligi kerak
- PII saqlanmaydi
- IP to'g'ridan-to'g'ri saqlanmaydi, hash yoki coarse metadata yetadi

## 12. Billing

Birinchi versiyada manual billing:

- admin tenant plan/statusni o'zgartiradi
- inactive tenant public sahifasi disabled ko'rinadi

Keyingi versiya:

- payment provider webhook
- plan limits
- invoice/payment history
- trial expiry reminders

## 13. Testing

Minimal testlar:

- host resolver unit test
- block schema validation test
- public renderer smoke test
- tenant permission test
- QR service test

E2E testlar:

- admin tenant yaratadi
- site publish qiladi
- subdomain public page ochiladi
- QR target URL to'g'ri

## 14. Observability

MVP:

- server error logging
- failed upload logging
- failed publish logging

Production:

- Sentry
- request id
- audit log: admin actions, publish, domain changes

## 15. Ish Bosqichlari

### Phase 1 - Foundation

- repo strukturani `src`ga o'tkazish
- env config
- database/ORM
- base UI layout
- auth skeleton
- role guard

### Phase 2 - Tenant + Public Site

- tenant model
- site/site version model
- host resolver
- public renderer
- seed data
- local preview route

### Phase 3 - Admin-Managed MVP

- admin CRUD
- builder forms
- publish flow
- QR generation
- media upload
- first deploy

### Phase 4 - Owner Self-Service

- owner dashboard
- registration/invite flow
- owner edit permissions
- preview/publish controls

### Phase 5 - Monetization and Growth

- plans
- manual billing first
- payment integration
- analytics dashboard
- custom domain

## 16. Definition of Done for MVP

MVP tayyor hisoblanadi, agar:

- admin yangi biznes qo'sha olsa
- biznes uchun `slug.bm.com` ishlasa
- public sahifa mobil telefonda yaxshi ko'rinsa
- QR code public sahifaga olib borsa
- ma'lumotlarni publish qilish mumkin bo'lsa
- kamida hero, contact, services, gallery, location blocklari ishlasa
- bitta real mijoz uchun sahifa chiqarish mumkin bo'lsa

## 17. Hozirgi Keyingi Qadam

Keyingi coding bosqich:

1. `src` strukturani yaratish.
2. `app` papkasini `src/app`ga ko'chirish.
3. `modules` va `shared` skelet papkalarini ochish.
4. Prisma yoki Drizzle tanlab database schema boshlash.
5. Tenant/site block TypeScript typelarini yozish.
6. Public rendererning mock data bilan ishlaydigan birinchi versiyasini qilish.
