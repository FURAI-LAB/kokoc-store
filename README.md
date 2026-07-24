# kokoc-worker

The storefront and admin backend for **[Kokoc Store](https://kokoc.store)** —
an e-commerce site selling Crocs, Jibbitz charms, and Adidas Originals sourced
from Vietnam, with delivery across Russia.

Built as a single Cloudflare Worker: server-rendered HTML pages, a JSON API,
an admin panel, and a small anti-cheat minigame, all running on Cloudflare's
edge with D1, KV, and R2 for storage.

---

## Stack

- **Runtime:** [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- **Database:** [D1](https://developers.cloudflare.com/d1/) (SQLite at the edge)
- **Key-value storage:** [Workers KV](https://developers.cloudflare.com/kv/) — rate limiting, session/promo lookups
- **Object storage:** [R2](https://developers.cloudflare.com/r2/) — product images
- **Static assets:** Workers Static Assets (served from `public/`)
- **Rendering:** hand-written server-side HTML templates (no frontend framework — pages are template strings, styled inline, with vanilla JS for interactivity)
- **Testing:** [Vitest](https://vitest.dev/) with [`@cloudflare/vitest-pool-workers`](https://developers.cloudflare.com/workers/testing/vitest-integration/) (runs against real Workers runtime + D1 migrations)
- **Languages:** Russian and English (`ru` / `en`), locale-aware routing and content

No frontend build step, no bundler config beyond what Wrangler provides —
the Worker is the whole application.

## Project structure

```
kokoc-worker/
├── src/
│   ├── index.js               # Worker entrypoint (fetch + scheduled handlers)
│   ├── server.js              # Top-level request router
│   ├── config/
│   │   └── app.js             # App-wide config (site name, contacts, etc.)
│   ├── pages/                 # Server-rendered HTML pages
│   │   ├── landing.js
│   │   ├── catalog.js
│   │   ├── crocs.js
│   │   ├── adidas.js
│   │   ├── product.js
│   │   ├── collabs.js / collabs-detail.js
│   │   ├── about.js
│   │   ├── delivery.js
│   │   ├── minigame.js        # "Собери Jibbitz" match-3 minigame page
│   │   ├── not-found.js
│   │   └── admin/             # Admin panel shell + client-side admin UI
│   ├── routes/
│   │   ├── api/               # Public JSON API (cart, orders, minigame, subscribe)
│   │   └── admin/             # Admin JSON API (products, orders, reviews, settings…)
│   └── lib/                   # Shared logic: catalog, i18n, SEO, security,
│                              # rate limiting, minigame engine, email, etc.
├── db/
│   └── migrations/            # D1 schema migrations, applied in order
├── public/                    # Static assets (images, icons, minigame art)
├── test/                      # Vitest test suite
├── wrangler.toml              # Cloudflare Worker + bindings config
└── package.json
```

## Getting started

**Prerequisites:** Node.js, npm, a Cloudflare account with access to this
Worker's D1 database, KV namespace, and R2 bucket (bindings are already
configured in `wrangler.toml`; you'll need `wrangler login` and account
access to run against real resources).

```bash
npm install

# Run the worker locally (Wrangler dev server, uses local D1/KV/R2 emulation
# unless configured otherwise)
npm run dev

# Sanity-check that the worker imports cleanly (fast, no server spin-up)
npm run check

# Run the test suite (spins up a real Workers runtime + applies D1 migrations)
npm test
npm run test:watch

# Deploy to production (kokoc.store / www.kokoc.store)
npm run deploy
```

## Routing overview

The Worker handles everything: page rendering, the public API, and the admin
panel, all dispatched from `src/server.js`.

**Pages** (server-rendered HTML)

| Path | Page |
|---|---|
| `/` | Landing page |
| `/catalog` | Full catalog |
| `/crocs` | Crocs category |
| `/adidas` | Adidas Originals category |
| `/product/:slug` | Product detail page |
| `/collabs`, `/collabs/:slug` | Collab drops |
| `/about` | About |
| `/delivery` | Delivery info |
| `/minigame` | "Собери Jibbitz" minigame |
| `/robots.txt`, `/sitemap.xml` | SEO |

**Public API** (`/api/*`, JSON)

| Path | Purpose |
|---|---|
| `/api/health` | Health check |
| `/api/catalog/products` | Product listing |
| `/api/cart`, `/api/cart/items`, `/api/cart/items/:id` | Cart CRUD |
| `/api/orders` | Order submission |
| `/api/subscribe` | Newsletter signup |
| `/api/minigame/start`, `/finish`, `/status` | Minigame session lifecycle |

**Admin** (`/admin/*`, cookie-authenticated)

Server-rendered shell + a JSON API under `/admin/api/*` covering products,
variants, product images (R2-backed), orders, reviews, collabs, categories,
brands, discounts, site settings, and subscriber/client lists.

## Database

Schema lives in `db/migrations/`, applied in numeric order. Core tables:
`products`, `product_variants`, `product_images`, `carts`, `cart_items`,
`orders`, `order_items`, `subscribers`, `product_reviews`, plus
`minigame_sessions` and `promo_codes` for the minigame's server-side
anti-cheat and promo issuance.

## The minigame

`/minigame` is a match-3 game ("Собери Jibbitz") that rewards players who
hit a score threshold with a one-per-device promo code (500 ₽ off Crocs).
To prevent client-side score manipulation, move validation and scoring are
replayed server-side against a seeded PRNG — the client only ever proposes
moves; the server is the source of truth for the final score. See
`src/lib/minigame-engine.js` and `src/routes/api/minigame.js`.

## Security

- Per-request CSP nonce, enforced via `script-src 'self' 'nonce-...'` (no
  `unsafe-inline`) — see `src/lib/security.js`
- Standard security headers (HSTS, etc.) applied to every response
- KV-backed sliding-window rate limiting on sensitive endpoints —
  see `src/lib/ratelimit.js`
- Cookie-based admin authentication (`src/routes/admin/auth.js`)

## Internationalization

Content is available in Russian (`ru`, default) and English (`en`). Locale
is resolved from the `?lang=` query param, a locale cookie, or falls back to
the default — see `src/lib/i18n.js`.

## Deployment

Deployment is via Wrangler (`npm run deploy`), targeting the custom domains
`kokoc.store` and `www.kokoc.store`. A daily cron trigger (`0 3 * * *`)
cleans up expired open carts. Static assets are uploaded from `public/` and
diffed against what's already live, so only changed files are pushed on
each deploy.
