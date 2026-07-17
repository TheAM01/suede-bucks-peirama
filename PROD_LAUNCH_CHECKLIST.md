# SuedeBucks — Production Launch Checklist

What you need, in what order, to take this from local demo to a live deployment
for Peirama. Companion doc: `DATA_MIGRATION_PLAN.md` (how to swap mock data for
real records — that work is a **prerequisite for a "real" launch** but the app can
be deployed in demo mode without it).

---

## 1. What you'll need (infrastructure shopping list)

| Piece | Do you need it? | Recommendation |
|---|---|---|
| **Hosting (Node)** | **Yes** | Vercel (zero-config for Next.js) or a VPS/Fly.io/Railway with `node >= 20`. The app is a standard Next.js 16 server app — no special runtime. |
| **Domain + TLS** | **Yes** | e.g. `admin.peirama.com`. TLS is automatic on Vercel/Fly; use Caddy/nginx + Let's Encrypt on a VPS. The session cookie is `secure` in production, so HTTPS is required for login to work. |
| **Database** | **Yes, for production** — see below | **MongoDB** (Atlas free tier M0 is plenty). Already wired in: set `MONGODB_URI` and the app uses it automatically. |
| **Shopify Dev Dashboard app** | **Yes** (for real data) | Created at dev.shopify.com and installed on the Peirama store; its **Client ID + Secret** are entered via the in-app **Integrations** page (client credentials grant — short-lived tokens, auto-refreshed). |
| **Secret manager / env vars** | **Yes** | Host-provided env vars are fine. Never commit `.env.local`. |
| **Error monitoring** | Strongly recommended | Sentry free tier (`@sentry/nextjs`). |
| **Uptime check** | Nice to have | UptimeRobot/BetterStack pinging `/login`. |
| Redis / queue | Not yet | Only if webhook volume grows (Phase 5+ of migration plan). |
| CDN / image host | Not yet | Needed once product images are shown (Shopify serves its own CDN URLs). |

### So… do we need a database?

**Right now (demo mode): no.** Everything runs from the in-memory mock, and the
one persistent thing — Shopify credentials from the Integrations page — sits in a
JSON file (`.data/integrations.json`).

**For production: yes.** Four concrete reasons:

1. **Integration credentials** — the JSON file only works on a host with a
   persistent writable disk (a VPS). On serverless hosts (Vercel), the filesystem
   is ephemeral and multi-instance, so credentials would vanish between requests.
   A DB row (encrypted at rest) is the correct home.
2. **App-owned data** — POS registers, POS staff, and segments have no Shopify
   home. Any CRUD you do on them must land somewhere durable.
3. **Speed + analytics** — dashboards and KPI aggregates over orders are far
   cheaper against a local mirror (synced by webhooks) than live Shopify API
   calls, which are rate-limited.
4. **Audit/sessions later** — multi-user roles, activity logs, and revocable
   sessions all want a DB.

**Decision: MongoDB.** Create a free **MongoDB Atlas** cluster (M0), set
`MONGODB_URI` (+ optional `MONGODB_DB`, default `suedebucks`) — the app
**already uses it automatically**: integration credentials persist to the
`integrations` collection the moment the env var is set, with the JSON file as
fallback when unset (`src/lib/db.ts`). Grow into collections for
`pos_registers`, `pos_staff`, `segments`, then the webhook mirror collections
from `DATA_MIGRATION_PLAN.md` Phase 5.

---

## 2. Pre-launch checklist — application hardening

### Secrets & auth
- [ ] Generate a **new** `SESSION_SECRET` for production (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) — never reuse the dev one.
- [ ] Set a **strong, unique** `ADMIN_PASSWORD` (the current `D@rkV1perAU` is in chat logs/docs — rotate it).
- [ ] Confirm `.env.local`, `.data/` are untracked (`git status`) — both are gitignored already.
- [ ] Add **login rate limiting** (simple in-memory counter per IP, or Upstash rate limit) — the login form currently allows unlimited attempts.
- [ ] Consider moving credential comparison to a **hashed** `ADMIN_PASSWORD_HASH` (bcrypt) so the plaintext isn't in env at all.
- [ ] Verify the session cookie flags in prod: `httpOnly`, `secure`, `sameSite=lax` (already coded — just confirm on the deployed site).

### Data
- [ ] Execute `DATA_MIGRATION_PLAN.md` **Phases 1–4** (data-source seam → Shopify client → reads → writes). Launching without this means launching a demo.
- [x] ~~Move integrations storage to the DB~~ — done: the MongoDB `integrations` collection is used automatically when `MONGODB_URI` is set. Remaining: encrypt the secret fields at rest (currently plaintext in the collection).
- [ ] Create collections for POS registers/staff and segments; point their resources at the DB.
- [ ] Gate the mock: seed data only loads when no Shopify connection exists (or `DEMO_MODE=1`).

### App correctness
- [ ] `npm run build` clean, `npx eslint src` clean (both currently pass).
- [ ] Set real store details in Settings (currency, timezone) — currently hardcoded defaults.
- [x] ~~Wire the bottom-bar connectivity dots to real checks~~ — done: the auth-gated `/api/status` route reports app health, a live MongoDB ping, and the stored Shopify check result; the bottom bar polls it every 60 seconds.
- [ ] Replace the static analytics demo series (revenue trend, traffic sources) with real aggregates, or label them clearly as samples.
- [ ] Review Guide content once real data lands — the technical tab documents the mock-store reality and will need its "demo store" caveats removed (they're flagged in the copy).

### Ops
- [ ] Deploy to the host; set env vars (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `MONGODB_URI`, `MONGODB_DB`).
- [ ] Point `admin.peirama.com` at it; confirm HTTPS + login round-trip.
- [ ] Install Sentry (or at minimum enable host log retention).
- [ ] Set up uptime monitoring on `/login`.
- [ ] Backups: enable Atlas automated backups (or scheduled `mongodump` if self-hosted).
- [ ] Add a `robots.txt` / `noindex` — an admin panel should not be indexed.

### Shopify integration
- [ ] Create the app in the **Shopify Dev Dashboard** (dev.shopify.com) under the
      account that owns the Peirama store. Grant the scopes below — the
      **Integrations page shows this same list with a copy button**
      (source of truth: `src/lib/shopify-scopes.ts`):
      ```
      read_products,write_products,read_orders,write_orders,
      read_draft_orders,write_draft_orders,read_customers,write_customers,
      read_inventory,write_inventory,read_discounts,write_discounts,
      read_price_rules,write_price_rules,read_checkouts,read_locations,
      read_fulfillments,write_fulfillments
      ```
      Optional (plan-dependent): `read_reports` (analytics), `read_users`
      (POS staff, Plus/POS Pro), `read_gift_cards` (Plus).
- [ ] Install the app on the Peirama store and copy its **Client ID + Client Secret**.
- [ ] Connect via **Dashboard → Integrations** (client credentials method) on the
      deployed site; confirm "Test connection" reports the shop name.
- [ ] Confirm token auto-refresh: the Integrations page shows "Access token:
      Fresh — cached" after a test, and a later test (post-expiry) still passes.
- [ ] (Phase 5) Register webhooks with HMAC verification for `orders/create`, `products/update`, `inventory_levels/update`.

---

## 3. Launch-day steps (in order)

1. **Freeze**: final `git commit`; tag `v1.0.0`.
2. **Provision**: DB created, env vars set on the host, domain DNS pointed.
3. **Deploy**: push → build passes → smoke-test the deployed URL:
   - `/` renders; `/dashboard` redirects to `/login` when signed out.
   - Login with prod credentials works; wrong password is rejected.
   - Every sidebar page loads; create/edit/delete works on one resource.
   - Guide loads; "How to use this page" deep-links land on the right section.
   - Integrations → Test connection returns green.
4. **Rotate**: confirm the dev credentials/secret are NOT the ones live.
5. **Monitor**: watch Sentry/logs for the first hours; uptime check green.
6. **Handoff**: give Peirama the URL + credentials over a secure channel (not email/chat).

---

## 4. Fast-follow (week one after launch)

- Login rate limiting if not done pre-launch.
- Real connectivity checks in the bottom bar.
- Webhook mirror (migration Phase 5) so dashboards use live aggregates.
- CSV export (the topbar menu item is currently a stub).
- A second admin account / roles, once a DB exists to hold them.
