# Phasing out dummy data → real records

The app currently runs on an **in-memory mock store** (`src/lib/seed.ts` seeds it,
`src/lib/store.tsx` holds it in React state). The good news: **every page already
reads and writes through one seam** — the `useStore()` hook and the generic
`ResourceView`. Nothing in the pages knows where data comes from. So the migration
is mostly "replace one implementation," not "rewrite 14 pages."

This plan takes it from mock → real in isolated, shippable phases. You can stop
after any phase and still have a working app.

---

## Phase 0 — Decide the source of truth (½ day)

Two categories of data:

- **Shopify-native** — products, collections, inventory, orders, draft orders,
  transactions, customers, discounts, abandoned checkouts, locations. These live
  in Shopify; the **Admin GraphQL API (2026-01)** is the source of truth.
- **App-owned** — POS registers, POS staff, and customer segments (unless you use
  Shopify's native segments). These have no clean Shopify home and belong in **your
  own database** — **MongoDB** (Atlas). Support is already wired in: set
  `MONGODB_URI` and `src/lib/db.ts` provides the connection; integration
  credentials already persist there automatically.

**Decision to make:** read Shopify **live on every request**, or **sync into your own
DB** and read from there. Recommended: **hybrid** — read live for detail/edit
actions (always fresh), sync high-traffic list/aggregate data into your DB via
webhooks for fast dashboards and analytics.

---

## Phase 1 — Introduce a data-access seam (1 day, no visible change)

Turn the concrete store into an interface so implementations are swappable.

1. Define `DataSource` in `src/lib/data/types.ts`:
   ```ts
   export interface DataSource {
     list(resource: string, opts?: ListOpts): Promise<{ rows: Row[]; total: number; cursor?: string }>;
     get(resource: string, id: string): Promise<Row | null>;
     create(resource: string, input: Record<string, unknown>): Promise<Row>;
     update(resource: string, id: string, patch: Record<string, unknown>): Promise<Row>;
     remove(resource: string, id: string): Promise<void>;
   }
   ```
2. Make the current mock a `MockDataSource` implementing it (wrap today's `SEED` logic).
3. Change `useStore()` to call the injected `DataSource` and move its methods to
   `async`. Add `loading` / `error` state; `ResourceView` shows the existing
   `<LoadingState />` and empty/error states (already built).

**Ship it:** identical behavior, but now backed by an interface. This is the pivot
point — every later phase just swaps or extends the implementation.

---

## Phase 2 — Stand up Shopify connectivity (1 day) — ✅ largely DONE

> Shopify retired admin-created custom apps and their permanent `shpat_` tokens.
> The app now uses the **OAuth client credentials grant**: an app created in the
> **Shopify Dev Dashboard** provides a Client ID + Secret, which the server
> exchanges for short-lived Admin API tokens (auto-cached/refreshed).

1. ✅ Credentials are entered in-app on **Dashboard → Integrations** (no env vars
   needed) and persisted server-side; `src/lib/integrations.ts` implements the
   token exchange (`resolveAccessToken()`) and a live connection check.
2. Create the app in the **Dev Dashboard** (dev.shopify.com), grant scopes
   (`read_products`, `write_products`, `read_orders`, `read_customers`,
   `read_inventory`, …), install it on the store, and connect via the
   Integrations page. A legacy `shpat_` token still works via the
   "Legacy admin token" method if the store has one.
3. ✅ Done: reusable client at `src/lib/shopify-client.ts` — `shopifyQuery(query,
   variables)` resolves/auto-refreshes the token, persists refreshed caches, and
   normalizes 401/403/429/GraphQL errors. **Server-only.** Phase 3 builds on it.
4. ✅ Done: the bottom-bar dots poll the auth-gated `/api/status` route (app
   health, live MongoDB ping, stored Shopify `lastCheck`).

---

## Phase 3 — Migrate reads, one resource at a time (start with Products)

Do **Products** first (richest, best-documented), then repeat the recipe.

1. Add `ShopifyDataSource.list("products", …)` → GraphQL `products(first, after, query)`.
   Map Shopify fields to the row keys already defined in `src/config/resources.ts`
   (`name`←`title`, `sku`, `price`←`variants[0].price`, `stock`←`totalInventory`,
   `status`, `vendor`).
2. Move list fetching **server-side**: convert `/dashboard/[resource]` to fetch the
   first page in the Server Component and hydrate `ResourceView`.
3. Switch pagination to **cursor-based** (Shopify uses `pageInfo.endCursor`). The
   bottom-bar controls already centralize page state — point next/prev at cursors.
4. Move search/sort server-side for large sets (Shopify `query:` + `sortKey`); keep
   client filtering as a fallback for small ones.
5. Route each resource key to its source in a registry, so you migrate incrementally:
   ```ts
   const SOURCES = { products: shopify, orders: shopify, /* rest: */ ...mockFallback };
   ```

Repeat for: orders → customers → collections → inventory → discounts → draft orders
→ transactions → abandoned checkouts → locations.

---

## Phase 4 — Migrate writes (create / edit / delete)

1. Implement `create/update/remove` as **Server Actions** calling GraphQL mutations
   (`productCreate`, `productUpdate`, `productDelete`, etc.). The `ResourceForm`
   already produces a clean values object keyed by the same field names.
2. Keep the **optimistic UX**: update local state immediately, then reconcile with
   the server response; roll back and toast on error.
3. Enforce Shopify's rules the mock ignored — required fields, uniqueness, handle
   generation, variant/inventory relationships. Surface validation errors in the drawer.
4. Respect **rate limits** (GraphQL cost-based): add retry-with-backoff in the client.

---

## Phase 5 — Webhooks + persistence (for speed & real-time)

1. Add MongoDB (✅ done — `src/lib/db.ts`, enabled via `MONGODB_URI`). Mirror the
   Shopify entities you list/aggregate often as collections.
2. Register **webhooks** (`products/update`, `orders/create`, `inventory_levels/update`,
   …) → a Route Handler that upserts into your DB. Verify HMAC signatures.
3. Point list/analytics reads at the DB (fast, paginated, aggregatable); keep detail
   fetch/edit live against Shopify. This makes the dashboard KPIs real and cheap.

---

## Phase 6 — App-owned data → your DB

POS **registers**, POS **staff**, and (if not using Shopify segments) **segments**
have no Shopify home. Create MongoDB collections and a `DbDataSource` implementing the same
`DataSource` interface. If you adopt Shopify POS, map registers/staff to
`shopifyPosDevice` / staff accounts instead.

---

## Phase 7 — Cutover & cleanup

- Flip every resource's source registry entry off the mock.
- Keep `src/lib/seed.ts` for **tests, Storybook, and local dev without credentials**
  (gate it behind `if (!process.env.SHOPIFY_ADMIN_TOKEN) useMock()`), but never serve
  it in production.
- Remove the "demo store" disclaimers from the Guide's technical copy.

---

## Why this is low-risk here

- **One seam:** all 14 resources go through `useStore()` → migrating the store
  migrates every page at once, and the per-resource registry lets you do it gradually.
- **Config already matches the API shape:** `src/config/resources.ts` field/column
  definitions are the mapping targets — mostly rename-and-map, little new UI.
- **Auth is ready:** the app already gates `/dashboard/*`; only the *server-side*
  Shopify token handling is new, and it stays on the server.

### Rough sequencing

| Phase | Scope | Est. |
|---|---|---|
| 0 | Decide source of truth | ½ day |
| 1 | `DataSource` seam (async store) | 1 day |
| 2 | Shopify client + secrets | 1 day |
| 3 | Reads, per resource | ~1 day each, parallelizable |
| 4 | Writes (mutations) | 2–3 days |
| 5 | Webhooks + DB cache | 3–4 days |
| 6 | App-owned collections (POS, segments) | 2 days |
| 7 | Cutover & cleanup | 1 day |
