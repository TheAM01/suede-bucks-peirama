# SuedeBucks / Peirama

A Shopify store-management dashboard — full CRUD over every store resource
(customers, orders, products, inventory, POS, and more), built with the
**Vance** design language re-skinned to a suede-and-gold brand.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind CSS v3** + CSS-variable design tokens (per `DASHBOARD_DESIGN_GUIDELINES.md`)
- `class-variance-authority` · `clsx` + `tailwind-merge` · `lucide-react` · `next-themes`
- Auth: single admin account via env vars + a signed HMAC session cookie
- Data: an in-memory mock store (`src/lib/seed.ts` + `src/lib/store.tsx`) standing
  in for a future Shopify Admin API integration

## Getting started

```bash
npm install
cp .env.example .env.local   # then set a SESSION_SECRET
npm run dev                  # http://localhost:3000
```

### Login

The dashboard is gated by a single admin account read from the environment:

```
ADMIN_USERNAME=peirama
ADMIN_PASSWORD=D@rkV1perAU
```

Set these (and a random `SESSION_SECRET`) in `.env.local`. `src/proxy.ts`
protects every `/dashboard/*` route; unauthenticated visits redirect to `/login`.

## Layout of the app

- `/` — public landing page ("Hello, this is SuedeBucks/Peirama") with a simple nav.
- `/login` — credential login (no signup).
- `/dashboard` — the app. Sidebar grouped by **Overview · Relations · Catalog ·
  Sales · Point of Sale · System**, a sticky topbar (heading/subheading,
  breadcrumbs, search, page settings, user menu) and a bottom bar (connectivity
  status, "How to use this page", wordmark, pagination).
- `/dashboard/[resource]` — a generic engine renders every list page (KPI cards,
  searchable/sortable table, create/edit drawer, delete) from `src/config/resources.ts`.
- `/dashboard/guide` — an in-app wiki: every topic explained twice (everyday /
  technical) with a scroll-spy TOC and deep-linkable sections. The bottom-bar
  "How to use this page" button deep-links here to the matching section.

## Key directories

```
src/app                  routes (login, home, dashboard/*)
src/components/ui         design-system primitives
src/components/dashboard  shell (sidebar/topbar/bottom-bar) + views + resource engine
src/components/guide      the two-tab wiki renderer
src/config               nav structure, resource definitions
src/content              guide content (data-driven)
src/lib                  auth/session, mock store + seed, utils
```

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — ESLint
