# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Before writing any code

This is **Next.js 16** with breaking changes from what your training data expects — `AGENTS.md`
(imported above) requires reading `node_modules/next/dist/docs/` before writing routing/config
code. The one you will hit immediately: **route protection uses `src/proxy.ts` (a `proxy()`
export), not `middleware.ts`** — see `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
Don't assume any other App Router API matches what you already know; check the docs folder first.

## Commands

```bash
npm run dev      # dev server, http://localhost:3000
npm run build    # production build
npm run start    # run a production build
npm run lint     # ESLint (eslint.config.mjs)
npm run seed:orders            # dry run: 20 fictional US orders for the connected Shopify store
npm run seed:orders -- --yes   # create them (tagged suedebucks-seed); add --delete to remove them
```

There is no test suite/runner configured in this repo.

Required env vars for `npm run dev` (`.env.local`): `ADMIN_USERNAME`, `ADMIN_PASSWORD`,
`SESSION_SECRET` (random string for the session HMAC). `MONGODB_URI` is optional — without it,
app-owned resources (registers, pos-staff, segments) read as empty instead of erroring. Shopify
connectivity is **not** env-configured: it's set up at runtime via the in-app Dashboard →
Integrations page (OAuth client credentials), not env vars.

## Architecture

### Auth

The **Owner** account comes from `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars and always has every
permission. Other **users** are created on the Users page (`src/lib/users.ts`, MongoDB `app_users`,
scrypt hashes, temporary password → forced change) with a per-page `none`/`view`/`manage` checklist
(`src/config/permissions.ts`). `src/lib/session.ts` is edge-safe (Web Crypto only, no
`next/headers`) and signs a `base64url(payload).base64url(hmac)` cookie (users' cookies carry `uid` +
`sessionVersion`). `src/proxy.ts` only checks the cookie's signature; the real checks are in
`src/lib/guard.ts`:
**every dashboard page must call `requirePage(path, level)`**, route handlers `apiGuard`, server
actions `actionGuard` (layouts don't re-run on client navigation, so they can't gate pages). When you
add a page, give it a guard; when you add a sidebar page, it automatically becomes a permission area.
`getCurrentUser()` re-reads the user each request, so permission changes and revocations apply at once.

### The generic resource engine

Almost every dashboard page is one config-driven engine, not 14 hand-built pages:

- `src/config/resource-types.ts` — the schema (`ResourceConfig`, `ResourceField`, `ResourceColumn`,
  `StatDef`, etc).
- `src/config/resources.ts` — the single registry (`RESOURCES`), one entry per resource
  (customers, products, orders, inventory, stock-adjustments, registers, ...). Each entry declares
  its table columns, form fields, computed KPI stats, search keys, and a `guide` slug.
- `src/app/dashboard/[resource]/page.tsx` + `src/components/dashboard/resource-view.tsx` render the
  list/table/create-edit-drawer/delete UI for *any* resource purely from its config.
- **To add a new resource type, add an entry to `RESOURCES` — don't hand-build a page.** Special
  cases (locked rows, a custom detail route via `rowHref`, live cross-resource option lists via
  `optionsFrom`) are all expressed as config, see `stock-adjustments` and `orders` for examples.

### Data layer — three sources, one client seam

`src/lib/store.tsx` (`StoreProvider` / `useStore` / `useResource`) is the only thing components
talk to. It fetches `/api/resources/[resource]`, caches per-resource, and exposes
`create`/`update`/`remove`. The API route (`src/app/api/resources/[resource]/route.ts` and
`.../[id]/route.ts`) dispatches each resource to one of:

1. **App-owned** (`registers`, `pos-staff`, `segments`) — MongoDB, one collection per resource, via
   `src/lib/app-data.ts` (`APP_OWNED_COLLECTIONS`). Full CRUD. Segment `members` count is always
   derived from `customerIds` on read/write, never stored independently.
2. **Shopify-backed** (products, orders, customers, inventory, discounts, ...) — live Admin GraphQL
   reads via `SHOPIFY_READERS` in `src/lib/shopify-reads.ts`; writes (where they exist) via
   `SHOPIFY_WRITERS` in `src/lib/shopify-writes.ts`. **No entry in `SHOPIFY_WRITERS` means the
   resource is read-only** in the UI. All requests go through `shopifyQuery()` in
   `src/lib/shopify-client.ts`, which resolves/refreshes the OAuth token via
   `src/lib/integrations.ts` and normalizes 401/402/403/429 errors.
3. **`stock-adjustments`** — its own module (`src/lib/stock-adjustments.ts`): an audited
   adjustment document. Completing one posts the quantity delta to Shopify inventory and then the
   row becomes immutable (`rowLocked` in its resource config).

There is **no mock/seed data** — when Shopify isn't connected or Mongo isn't configured, resources
read as empty with an explanatory error rather than falling back to placeholders. `README.md` and
`DATA_MIGRATION_PLAN.md` describe an earlier in-memory-mock-store phase and are now stale on this
point; trust the code (`src/lib/store.tsx`'s own comment states it explicitly) over those docs.

### The in-app Guide (`/dashboard/guide`)

`src/content/guide.ts` exports `GUIDE_SECTIONS`, a single ordered array driving the whole page —
no JSX, plain data with a tiny inline markdown subset (`**bold**`, `` `code` ``). Every section is
written **twice** (an "everyday" non-technical version and a "technical" version); rendering,
tabs, scroll-spy TOC, and deep-linking live in `src/components/guide/`. Exact required behavior
(tab switching without scroll-jump, `#slug` deep links, collapsible deep-dives) is specified in
`guide-page-spec.md` — read it before touching the guide renderer.

Each resource config's `guide` key (`src/config/resources.ts`) is a section `id` in
`GUIDE_SECTIONS`; the dashboard bottom bar's "How to use this page" link deep-links to
`/dashboard/guide#<that id>`, so a resource's guide slug must exist in `GUIDE_SECTIONS`.

**Whenever you change a feature in this codebase — new resource, new field, changed behavior,
new page — update the corresponding section (or add one) in `src/content/guide.ts` in the same
change, in both the everyday and technical versions.** Treat the guide as part of the feature, not
follow-up documentation.

### Design system

Tailwind **v3** (not v4) + CSS-variable HSL tokens, `class-variance-authority` primitives in
`src/components/ui/`. `DASHBOARD_DESIGN_GUIDELINES.md` is the full, binding style spec (color
tokens, radius/shadow scale, typography scale, the 4-up KPI grid, card/button/badge anatomy,
sidebar's own scoped `--sidebar-*` palette). Read it before building new UI rather than guessing
Tailwind defaults — this app's look depends on using the existing tokens, not raw hex/gray values.
