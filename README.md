# Kokoc Store

> Storefront and admin backend for **[kokoc.store](https://kokoc.store)** — Crocs,
> Jibbitz charms, and Adidas Originals sourced from Vietnam, delivered across Russia.
> Built by [FURAI lab](https://github.com/FURAI-LAB).

A single Cloudflare Worker: server-rendered HTML, a JSON API, an admin panel, and a
match-3 minigame with server-authoritative scoring — all running at the edge on D1,
KV, and R2. No frontend framework, no build step.

---

## Stack

| Layer | Choice |
|---|---|
| Runtime | Cloudflare Workers |
| Database | D1 (SQLite at the edge) |
| Key-value | Workers KV — rate limiting, settings, promo lookups |
| Objects | R2 — product images |
| Static assets | Workers Static Assets (`public/`) |
| Rendering | Server-side template strings, inline CSS, vanilla JS |
| Tests | Vitest + `@cloudflare/vitest-pool-workers` (real Workers runtime + D1) |
| Languages | Russian / English, locale-aware routing |

## Routes

**Storefront**

| Path | Description |
|---|---|
| `/` | Landing page |
| `/catalog` | All products, with sort / tag / search / brand filters |
| `/crocs` | Crocs landing page — own H1, copy, FAQ, size chart |
| `/adidas` | Adidas Originals landing page |
| `/product/:slug` | Product detail with variants, images, reviews |
| `/collabs`, `/collabs/:slug` | Collaboration pages |
| `/delivery`, `/about` | Static content |
| `/minigame` | "Собери Jibbitz" match-3, earns a promo code |
| `/robots.txt`, `/sitemap.xml` | Generated from live catalog data |
| `/r2/*`, `/cdn/*` | Image proxy in front of R2 |

**Public API**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Service status and binding availability |
| `GET` | `/api/catalog/products` | Paginated catalog |
| `GET` | `/api/catalog/products/:slug` | Product detail (quick-view) |
| `GET/POST` | `/api/cart`, `/api/cart/items`, `/api/cart/items/:id` | Cart operations |
| `POST` | `/api/orders` | Create an order (validated against D1) |
| `GET/POST` | `/api/products/:slug/reviews` | Read approved reviews, submit new ones |
| `POST` | `/api/subscribe` | Newsletter signup |
| `POST` | `/api/minigame/start`, `/api/minigame/finish` | Game session, server-side replay |
| `GET` | `/api/minigame/status` | Whether this device already earned a code |

**Admin** — everything under `/admin/*` sits behind a signed session cookie.
`/admin/api/*` covers products, variants, images, orders, reviews, collabs,
clients, subscribers, categories, brands, discounts, settings, and stats.

## Structure

```
src/
  index.js                    Worker entrypoint (fetch + scheduled)
  server.js                   Top-level router
  config/
    app.js                    Site name, domain, contacts
    brand-pages.js            Per-brand config for /crocs and /adidas
  lib/
    catalog.js                Catalog and product-detail queries
    collabs.js                Collaboration data
    cookies.js                Cookie parsing, session cookie
    csrf.js                   Same-origin guard for mutating requests
    html.js                   HTML escaping (server + client)
    i18n.js                   ru/en translations, locale detection
    ids.js                    Random IDs and promo codes
    markdown.js               Markdown rendering
    minigame-engine.js        Deterministic match-3 replay
    navbar.js                 Shared navigation
    products.js               Product queries
    ratelimit.js              KV sliding-window limiter
    response.js               Response helpers
    reviews.js                Reviews and rating aggregates
    rich-text.js              Sanitised rich-text descriptions
    security.js               CSP nonces and security headers
    seo.js                    Meta tags, JSON-LD
    sitemap.js                sitemap.xml generation
    uploads.js                Upload allow-list, R2 key sanitising
  pages/                      Server-rendered HTML
    brand-catalog.js          Shared implementation for /crocs and /adidas
    crocs.js, adidas.js       Thin wrappers over brand-catalog
    catalog.js, product.js, landing.js, collabs.js, minigame.js, ...
    admin/                    Admin shell and per-section client modules
  routes/
    api/                      Public API
    admin/                    Admin API and auth
db/migrations/                D1 schema (0001-0010)
test/                         423 tests
docs/architecture-v1.md
public/                       Static assets
```

## Security

Every response carries security headers; storefront pages get a fresh CSP nonce
per request, so only the inline script block the server deliberately emits can run.

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'`, per-request `nonce-…` for scripts |
| `Permissions-Policy` | camera, microphone, payment, usb disabled |
| `Strict-Transport-Security` | `max-age=31536000` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |

Beyond headers:

- **Admin auth** — HMAC-signed session cookie, constant-time password comparison,
  rate-limited login.
- **SQL** — every query is parameterised; sort order comes from a whitelist map,
  never from user input.
- **CSRF** — same-origin check on all mutating `/api/*` requests.
- **Uploads** — file extension *and* content-type come from a fixed allow-list, never
  from the uploader's `file.type`. SVG is rejected (it can carry inline script).
- **Orders** — prices are re-checked against D1, so a client cannot forge a cheap order.
- **Minigame** — the server replays the submitted moves against its own seed; the
  client's on-screen score is cosmetic.

## Local development

```bash
npm install
npm run dev          # wrangler dev on http://localhost:8787
```

Create `.dev.vars` for local secrets (git-ignored):

```
ADMIN_PASSWORD=<anything, local only>
ADMIN_SECRET=<random 32+ chars>
```

Apply migrations to the local D1 before first run:

```bash
for f in db/migrations/*.sql; do
  npx wrangler d1 execute kokoc-store --local --file "$f"
done
```

Production secrets go through `wrangler secret put` and never live in files.

## Tests

```bash
npm test             # 423 tests
npm run test:watch
```

Tests run against the real Workers runtime with D1 migrations applied, so they
exercise actual SQL rather than mocks. They also run on every push and pull
request via GitHub Actions.

Two suites exist specifically to stop known bugs from returning:

- `xss-regression.test.js` — product and cart data must stay escaped at every
  `innerHTML` call site.
- `security-regression.test.js` — cart quantity validation, upload allow-list, R2
  key sanitising, CSRF coverage, and helper deduplication.

## Deploy

```bash
npm run deploy       # wrangler deploy
npx wrangler rollback
```

Requires `wrangler.toml` bindings for D1, KV, and R2.

---

Built by [FURAI lab](https://github.com/FURAI-LAB) — edge-native systems and digital autonomy.
