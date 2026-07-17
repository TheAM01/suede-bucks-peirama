import type { GuideSection } from "./guide-types";

/**
 * In-app knowledge base. SuedeBucks is the store-management system; Peirama is
 * the store this installation is white-labelled for.
 * Every topic is authored twice — an "everyday" (shop-operator) altitude and a
 * "technical" (implementation) altitude — plus optional deep dives. Pure data:
 * inline strings support only **bold** and `code` markdown.
 */
export const GUIDE_SECTIONS: GuideSection[] = [
  // ==========================================================================
  {
    id: "overview",
    title: "Platform overview",
    category: "Getting started",
    everyday: [
      {
        t: "p",
        text: "**SuedeBucks** is a store-management system for running a shop online and in person. This installation is **white-labelled** for **Peirama**, a perfume house — so throughout the app, SuedeBucks is the software and Peirama is the store you are managing. It is where you manage the people who buy from you, the things you sell, the orders that come in, and the tills in your physical stores — all in one place.",
      },
      {
        t: "p",
        text: "The left sidebar groups everything into six areas. You will spend most of your day inside these:",
      },
      {
        t: "dl",
        items: [
          { term: "Overview", def: "The **Analytics** dashboard — your headline numbers for sales, orders, and customers at a glance." },
          { term: "Relations", def: "The people side of the business: **Customers**, **Segments** (groups of customers), and **Discounts**." },
          { term: "Catalog", def: "What you sell: **Products**, **Collections**, **Inventory** (stock levels), and **Categories**." },
          { term: "Sales", def: "Money coming in: **Orders**, **Draft orders**, **Transactions**, and **Abandoned checkouts**." },
          { term: "Point of Sale", def: "Selling in person: **Registers**, **Locations**, and **POS staff**." },
          { term: "System", def: "**Settings** for the shop and your account." },
        ],
      },
      {
        t: "p",
        text: "Almost every page works the same way, so once you learn one you know them all. At the top you get four **stat cards** with the key numbers, a **search box** to find a row fast, and a **table** you can sort by clicking a column heading. To add something new, click the **New** button and a form slides in from the right; to change something, click its row. Long lists are split into pages you flip through at the bottom.",
      },
      {
        t: "ol",
        items: [
          "Pick an area from the left sidebar (for example, Catalog then Products).",
          "Scan the four stat cards at the top for the headline numbers.",
          "Use search or click a column heading to find the row you want.",
          "Click a row to edit it in the drawer, or click New to create one.",
          "Save. Your change appears in the table straight away.",
        ],
      },
      {
        t: "callout",
        tone: "info",
        title: "Lost on any page? Look at the bottom bar.",
        text: "Every page has a **How to use this page** button in the bottom bar. It jumps you straight to the matching help section right here in this guide — so you are never more than one click from an explanation.",
      },
      {
        t: "p",
        text: "The bar across the top shows the page name and a short description, breadcrumbs so you know where you are, the search box, a per-page settings button, and your account menu (profile, role, and log out). The bar across the bottom shows connection status dots, the How to use this page button, the SuedeBucks / Peirama wordmark, and the page-flip controls.",
      },
    ],
    technical: [
      {
        t: "p",
        text: "SuedeBucks is a **Next.js 16** App Router application — a reusable store-management console that is **white-labelled** per client; this deployment is branded for the **Peirama** store. It presents itself as a Shopify store-management console but currently runs entirely against a deterministic client-side mock. It is structured so that the mock can later be swapped for a real **Shopify Admin API** integration with minimal change to the UI layer.",
      },
      {
        t: "h",
        text: "Authentication and session",
      },
      {
        t: "p",
        text: "There is a single admin account. The login form posts a username and password which are compared against the `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables. On success the server issues a signed **HMAC** session cookie named `sb_session` with a 7-day expiry. `src/proxy.ts` verifies that cookie on every `/dashboard/*` request and redirects to `/login` when it is missing or invalid.",
      },
      {
        t: "h",
        text: "Data layer (today vs. later)",
      },
      {
        t: "p",
        text: "All rows are seeded deterministically by `src/lib/seed.ts` and held in React state by the store provider in `src/lib/store.tsx`. This means every create, edit, and delete lives **in memory for the current browser session only** and resets on a full page reload. In production this layer would be replaced by calls to the **Shopify Admin GraphQL/REST API**, with **webhooks** keeping the local view in sync.",
      },
      {
        t: "p",
        text: "Every resource screen is generated from one shared engine driven by a config object. The list of resources and their columns, drawer fields, statuses, and KPI computations lives in `src/config/resources.ts`. The shared chrome is: a 4-card KPI row, a debounced search box over each resource's `searchKeys`, a sortable/paginated table, and a right-side drawer form for create/edit plus per-row delete.",
      },
      {
        t: "callout",
        tone: "warning",
        title: "Edits are not persisted",
        text: "Because the store is in-memory, treat this build as a live demo. Anything you change is discarded on reload. Do not rely on it as a system of record until the Shopify Admin API integration replaces `src/lib/store.tsx`.",
      },
      {
        t: "p",
        text: "The Guide itself is data-driven from `src/content/guide.ts` against the `GuideSection` type. It renders two audience tabs (For everyday use / Technical), a sticky table of contents with scroll-spy, deep-linkable section slugs (the `id` on each section), and honours a `?tab=technical` URL parameter so a deep link can open the technical altitude directly.",
      },
    ],
    deep: [
      {
        title: "How the bottom bar connection dots work",
        everyday: [
          { t: "p", text: "The three coloured dots in the bottom bar tell you at a glance whether the app is healthy. Green means good; a dim or red dot means that piece is having trouble." },
          { t: "ul", items: ["**App** — the dashboard front end itself.", "**DB** — where your data is stored.", "**Shopify** — the live link to your Shopify store."] },
          { t: "p", text: "In this demo build the Shopify dot is expected to be inactive because there is no real store connected yet. That is normal, not a fault." },
        ],
        technical: [
          { t: "p", text: "The status dots reflect three liveness signals: the front-end app, the data store, and the Shopify sync channel. In the current mock build only the app and the in-memory store report healthy; the Shopify channel is intentionally shown as offline because no Admin API credentials are wired up." },
          { t: "p", text: "When the integration lands, the Shopify dot should track webhook connectivity and the last successful sync, and the DB dot should track the persistence backend that replaces the in-memory `store.tsx` state." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "analytics",
    title: "Analytics",
    category: "Overview",
    everyday: [
      { t: "p", text: "The **Analytics** page is your home base. It pulls the most important numbers from across the shop into one screen so you can see how the business is doing without digging through every section." },
      { t: "p", text: "Look here first thing in the morning to answer three questions: are sales up or down, are there orders waiting on you, and are any products about to run out." },
      {
        t: "dl",
        items: [
          { term: "Revenue", def: "Total money taken over the period, usually shown with an up or down arrow versus the previous period." },
          { term: "Orders", def: "How many orders came in, across both online and in-store." },
          { term: "Customers", def: "New and returning shoppers, so you can see if your audience is growing." },
          { term: "Trends", def: "Small charts that show whether a number is rising or falling, not just where it stands today." },
        ],
      },
      { t: "ol", items: ["Open Overview then Analytics from the sidebar.", "Read the headline cards top to bottom.", "Note any card with a downward arrow — that is where to focus.", "Jump to the matching section (Orders, Inventory, Customers) to act on it."] },
      { t: "callout", tone: "info", title: "Numbers here are summaries", text: "Analytics rolls up figures from other pages. To change or investigate a number, go to the page it comes from — for example open **Orders** to see the individual sales behind your revenue total." },
    ],
    technical: [
      { t: "p", text: "The Analytics view is a read-only aggregation over the same seeded rows the resource pages use. It does not own any data of its own; it derives KPIs and trend series from the customers, orders, transactions, products, and inventory collections held in `src/lib/store.tsx`." },
      { t: "p", text: "Deltas shown against KPIs (for example the `delta` values attached to revenue, orders, and customer counts in `src/config/resources.ts`) are illustrative period-over-period figures baked into the mock, not computed from a historical time series. There is no real dated history in the seed beyond each row's `createdAt`." },
      { t: "ul", items: ["Revenue derives from summing order `total` (and reconciles against transaction `amount` where `kind` is `sale` minus `refund`).", "Order counts and fulfilment backlog derive from the `orders` collection.", "Stock-risk figures derive from `inventory` rows whose `status` is `low` or `out`."] },
      { t: "callout", tone: "warning", title: "Aggregates reset with the store", text: "Because Analytics is computed live from the in-memory store, any edits you make on resource pages shift these numbers for the session and revert on reload. A production build would source these from the Shopify Admin API and a persisted analytics store." },
      { t: "p", text: "When wiring real data, keep Analytics a pure selector over the canonical collections so a single source of truth (the Admin API cache) drives both the resource tables and the dashboard, avoiding drift between a KPI and the rows behind it." },
    ],
    deep: [
      {
        title: "Why a KPI can disagree with the table below it",
        everyday: [
          { t: "p", text: "Sometimes a headline number looks slightly off from what you count in a table. Usually that is because the card is showing a comparison to last period, or it is counting only a certain status (like only active customers). Read the small label under each number to see exactly what it counts." },
        ],
        technical: [
          { t: "p", text: "Each stat card runs its own `compute` function over the row set (see the `stats` arrays in `src/config/resources.ts`). Some filter by status before counting (for example Active counts only `status === 'active'`), and some carry a static `delta`. A card and its table can therefore legitimately differ: the card may be a filtered aggregate or a period comparison rather than a raw row count." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "customers",
    title: "Customers",
    category: "Relations",
    everyday: [
      { t: "p", text: "The **Customers** page is your address book of everyone who buys from you. Each row is one person, with how many orders they have placed, how much they have spent in total, where they are, and when they joined." },
      { t: "p", text: "Use it to look someone up before you help them, to spot your best spenders, and to keep notes about a shopper for next time." },
      {
        t: "dl",
        items: [
          { term: "Full name", def: "The customer's name — shown first in the list." },
          { term: "Email", def: "Their contact address, used to reach them and to match them to orders." },
          { term: "Status", def: "Whether they are **Active**, **Invited** (asked to make an account but not yet signed up), or **Disabled**." },
          { term: "Location", def: "Where they are based." },
          { term: "Orders / Total spent", def: "Their lifetime order count and money spent — how valuable they are to you." },
          { term: "Notes", def: "A free box for anything you want to remember about them." },
        ],
      },
      { t: "ol", items: ["Open Relations then Customers.", "Search by name, email, or location to find a person.", "Click their row to open their profile in the drawer.", "Update details or add a note, then Save.", "Use New to add a customer you met in person or over the phone."] },
      { t: "callout", tone: "info", title: "Spend and order counts are lifetime totals", text: "The **Total spent** and **Orders** figures cover the customer's whole history with you, not just this month — handy for spotting loyal regulars." },
    ],
    technical: [
      { t: "p", text: "The customers resource is keyed `customers` in `src/config/resources.ts`. Search runs over `name`, `email`, and `location`. The drawer form fields are `name`, `email`, `status`, `location`, `orders`, `spent`, `createdAt`, and `notes`." },
      { t: "ul", items: ["`status` is one of `active`, `invited`, or `disabled`.", "`spent` is a currency field; `orders` is an integer count.", "`createdAt` is the join date, rendered as a date column labelled Joined."] },
      { t: "p", text: "The KPI row computes Total customers (row count, with an illustrative `delta`), Active (`status === 'active'`), New in 30 days (a fixed ~18% of the row count in the mock), and Average lifetime value (`sum(spent) / count`)." },
      { t: "callout", tone: "warning", title: "Orders and spent are stored fields here", text: "In this mock, `orders` and `spent` are plain columns on the customer row, not derived by joining the `orders` collection. Under a real Shopify integration these would be computed from the customer's order history rather than edited by hand." },
      { t: "p", text: "Creates and edits mutate the in-memory store for the session only. A production build would map this row to a Shopify `Customer` object and persist via the Admin API." },
    ],
    deep: [
      {
        title: "Invited vs. active vs. disabled",
        everyday: [
          { t: "p", text: "**Invited** means you sent them an invitation to create an account but they have not accepted yet. **Active** means they have a working account. **Disabled** means their account is switched off — they cannot log in, but their history stays for your records." },
        ],
        technical: [
          { t: "p", text: "These three states map cleanly onto Shopify's customer account states. `invited` corresponds to a pending account invitation, `active` to an enabled account, and `disabled` to a deactivated one. Filtering the KPI Active count on `status === 'active'` mirrors how you would query enabled accounts against the Admin API." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "segments",
    title: "Segments",
    category: "Relations",
    everyday: [
      { t: "p", text: "A **Segment** is a named group of customers who share something — for example everyone who bought a particular scent, or big spenders, or shoppers in one city. Segments let you talk to the right people instead of everyone at once." },
      { t: "p", text: "Each row shows the segment name, a short description, how many members it has, its recent growth, and when it was last updated." },
      {
        t: "dl",
        items: [
          { term: "Segment name", def: "A clear label for the group, like Repeat buyers or VIP." },
          { term: "Description", def: "What the group is and who belongs in it." },
          { term: "Members", def: "How many customers are currently in the group." },
          { term: "Growth %", def: "Whether the group is getting bigger or smaller lately." },
          { term: "Status", def: "**Active** (in use) or **Draft** (still being set up)." },
        ],
      },
      { t: "ol", items: ["Open Relations then Segments.", "Click New to create a group, or click a row to edit one.", "Give it a name and description so your team knows who it targets.", "Save it as Draft while you refine it, then set it Active when ready.", "Use an Active segment when setting up a discount or a campaign."] },
      { t: "callout", tone: "info", title: "Segments group people, collections group products", text: "It is easy to mix these up. A **segment** is a set of customers. A **collection** is a set of products. If you are grouping shoppers, you are in the right place." },
    ],
    technical: [
      { t: "p", text: "The segments resource is keyed `segments`; search covers `name` and `description`. Fields are `name`, `description`, `members`, `growth`, `status`, and `updatedAt`. `status` is `active` or `draft`." },
      { t: "ul", items: ["`members` is a stored integer count in the mock, not a live query result.", "`growth` is a percentage figure shown in the Growth column.", "KPIs: Segments (count), Total reach (`sum(members)`), Largest segment (`max(members)`), and Average size (`sum(members) / count`)."] },
      { t: "callout", tone: "warning", title: "Membership is not rule-driven yet", text: "In a real Shopify integration a segment would carry a query/definition and its `members` count would be evaluated dynamically. Here `members` is a static field on the row, so editing it does not re-select any customers." },
      { t: "p", text: "When backed by the Admin API this maps to a Shopify customer segment with a saved filter expression; the local `members` and `growth` fields would become derived read-only values refreshed on sync." },
    ],
    deep: [
      {
        title: "Draft segments are safe to experiment with",
        everyday: [
          { t: "p", text: "Keep a segment in **Draft** while you are still deciding who should be in it. Draft segments do not get used by discounts or campaigns, so you cannot accidentally message the wrong people while you tinker. Flip it to Active only when you are happy." },
        ],
        technical: [
          { t: "p", text: "Only `status === 'active'` segments should be selectable downstream (for example as a discount audience). Treat `draft` as excluded from any targeting join so an unfinished definition never reaches customers. The KPI row deliberately does not gate on status, so a large draft still contributes to Total reach — worth noting when reconciling numbers." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "discounts",
    title: "Discounts",
    category: "Relations",
    everyday: [
      { t: "p", text: "The **Discounts** page holds your promo codes and offers — the deals customers use at checkout to save money. Each row shows the code, what kind of deal it is, its value, whether it is running, how many times it has been used, and when it ends." },
      {
        t: "dl",
        items: [
          { term: "Code", def: "What the shopper types at checkout, like SUEDE20." },
          { term: "Type", def: "**Percentage** off, **Fixed amount** off, **Buy X get Y**, or **Free shipping**." },
          { term: "Value", def: "The size of the deal, for example 20% or $10." },
          { term: "Status", def: "**Active** (working now), **Scheduled** (starts later), or **Expired** (finished)." },
          { term: "Redemptions", def: "How many times the code has been used." },
          { term: "Starts / Ends", def: "The dates the offer runs between." },
        ],
      },
      { t: "ol", items: ["Open Relations then Discounts.", "Click New to create a code.", "Choose the type, enter the value, and set the start and end dates.", "Save it as Scheduled if it should begin later.", "Watch the Redemptions column to see how popular it is."] },
      { t: "callout", tone: "warning", title: "Check the dates before you launch", text: "A code will not work if its status is **Scheduled** or **Expired**. Make sure the start date has passed and the end date is in the future, and that the status reads **Active**, before you share a code with shoppers." },
    ],
    technical: [
      { t: "p", text: "The discounts resource is keyed `discounts`; search covers `code` and `value`. Fields: `code`, `type`, `value`, `status`, `used`, `startsAt`, `endsAt`." },
      { t: "ul", items: ["`type` is one of `percentage`, `fixed`, `bogo`, or `shipping`.", "`status` is one of `active`, `scheduled`, or `expired`.", "`value` is a free-text field (for example `20%` or `$10`) rather than a typed amount, so it is not validated against `type`.", "`used` is the redemption counter."] },
      { t: "p", text: "KPIs: Active discounts (`status === 'active'`), Total redemptions (`sum(used)` with an illustrative delta), Scheduled count, and Expired count." },
      { t: "callout", tone: "info", title: "Status is stored, not time-derived", text: "In the mock, `status` is an editable field — it does not auto-flip from `scheduled` to `active` to `expired` as the clock passes `startsAt` and `endsAt`. A real integration would compute effective status from the current time and the Shopify price-rule window." },
      { t: "p", text: "Maps to a Shopify discount / price rule. The loose `value` string would split into structured fields (percentage vs. fixed amount vs. shipping) under the Admin API." },
    ],
    deep: [
      {
        title: "The four discount types, and what BOGO means",
        everyday: [
          { t: "p", text: "**Percentage** takes a share off, like 20% off. **Fixed amount** takes a set sum off, like $10 off. **Free shipping** waives delivery. **Buy X get Y** (sometimes written BOGO, buy-one-get-one) gives a free or discounted item when they buy a qualifying one — for example buy two bottles, get a discovery set free." },
        ],
        technical: [
          { t: "p", text: "The `bogo` type is the one with no single numeric value — its `value` string is descriptive and the actual buy/get quantities would live in structured Shopify price-rule fields under a real integration. When validating input, `percentage` and `fixed` expect a parseable number/amount, `shipping` ignores `value`, and `bogo` needs a quantity rule the current free-text field cannot fully express." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "products",
    title: "Products",
    category: "Catalog",
    everyday: [
      { t: "p", text: "The **Products** page is your catalog — every item you sell, from eau de parfum to discovery sets to home candles. Each row shows the product name, its SKU code, category, price, current stock, and whether it is on sale to customers." },
      {
        t: "dl",
        items: [
          { term: "Title", def: "The product name shoppers see." },
          { term: "SKU", def: "Your internal code for the exact item, used to track stock." },
          { term: "Category", def: "The group it belongs to: Eau de Parfum, Eau de Toilette, Extrait, Discovery Sets, Body & Bath, or Home & Candles." },
          { term: "Vendor", def: "Who makes or supplies it." },
          { term: "Price / Cost per item", def: "What you sell it for, and what it costs you — the gap is your margin." },
          { term: "Stock", def: "How many you have to sell right now." },
          { term: "Status", def: "**Active** (on sale), **Draft** (hidden while you finish it), or **Archived** (retired)." },
        ],
      },
      { t: "ol", items: ["Open Catalog then Products.", "Click New to add a product.", "Fill in the title, price, category, and stock.", "Set the status to Draft while you work, then Active to sell it.", "Save. Search by name, SKU, category, or vendor to find it later."] },
      { t: "callout", tone: "warning", title: "Draft products are not for sale", text: "Only **Active** products appear to shoppers. If a new item is not selling, check that its status is not still set to **Draft** or **Archived**." },
    ],
    technical: [
      { t: "p", text: "The products resource is keyed `products`; search covers `name`, `sku`, `category`, and `vendor`. Fields: `name`, `sku`, `category` (select: Eau de Parfum / Eau de Toilette / Extrait / Discovery Sets / Body & Bath / Home & Candles), `vendor`, `price`, `cost`, `stock`, `status`, `description`." },
      { t: "ul", items: ["`status` is one of `active`, `draft`, or `archived`.", "`price` and `cost` are currency fields; margin is price minus cost.", "`stock` is a plain integer on the product row (distinct from the multi-location `inventory` resource)."] },
      { t: "p", text: "KPIs: Total products (count with delta), Active (`status === 'active'`), Out of stock (`stock <= 0`), and Inventory value (`sum(price * stock)` across all rows)." },
      { t: "callout", tone: "info", title: "Product stock vs. Inventory are two different tallies", text: "The `stock` field here is a single number per product. The **Inventory** page tracks the same items broken out by location with `onHand`, `committed`, and `available`. In the mock these are independent; a real integration would reconcile them so product stock equals the sum of available across locations." },
      { t: "p", text: "Maps to a Shopify `Product` (with variants). Here each row is a flat product; variants, images, and options would expand under the Admin API." },
    ],
    deep: [
      {
        title: "Cost per item and why margin matters",
        everyday: [
          { t: "p", text: "Filling in **Cost per item** lets the shop show your profit margin — the difference between what you pay for a product and what you sell it for. It is optional, but keeping it accurate means your profit reports actually mean something. A pair that sells for $120 but costs you $90 only makes $30 before other expenses." },
        ],
        technical: [
          { t: "p", text: "`cost` feeds margin calculations but is not currently surfaced in the products KPI row (Inventory value uses `price * stock`, i.e. retail valuation, not cost basis). If you need cost-of-goods valuation, that is a separate aggregation over `cost * stock`. Under Shopify, `cost` maps to the variant's unit cost used for profit reporting." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "collections",
    title: "Collections",
    category: "Catalog",
    everyday: [
      { t: "p", text: "A **Collection** is a themed set of products you group together — a Summer drop, a Best sellers shelf, or all your suede care items. Collections are how you merchandise your catalog into shoppable groups." },
      {
        t: "dl",
        items: [
          { term: "Title", def: "The collection name, like New Arrivals." },
          { term: "Type", def: "**Manual** (you pick each product) or **Automated** (products join by matching a rule)." },
          { term: "Products", def: "How many items are in the collection." },
          { term: "Status", def: "**Active** (visible) or **Draft** (hidden while you build it)." },
          { term: "Description", def: "A short blurb about the collection's theme." },
        ],
      },
      { t: "ol", items: ["Open Catalog then Collections.", "Click New, give the collection a title, and choose Manual or Automated.", "Add a description so the theme is clear.", "Save as Draft, then set Active when it is ready to show.", "Check the Products count to confirm items landed in it."] },
      { t: "callout", tone: "info", title: "Collection is not the same as Category", text: "A **collection** is a marketing group you curate (a Summer edit). A **category** is where a product structurally belongs (Eau de Parfum). One product sits in one category but can appear in many collections." },
    ],
    technical: [
      { t: "p", text: "The collections resource is keyed `collections`; search covers `name` and `description`. Fields: `name`, `type` (`manual` / `automated`), `products`, `status` (`active` / `draft`), `updatedAt`, `description`." },
      { t: "ul", items: ["`products` is a stored count in the mock, not a live membership query.", "KPIs: Collections (count), Products grouped (`sum(products)`), Automated (`type === 'automated'`), and Active (`status === 'active'`)."] },
      { t: "callout", tone: "warning", title: "Automated collections have no rules engine here", text: "An `automated` collection would normally carry match conditions (for example category equals Eau de Parfum, or price under $100) that auto-populate membership. In the mock there is no rule storage, so `automated` is only a label and `products` is a static number." },
      { t: "p", text: "Maps to Shopify custom (manual) and smart (automated) collections. The rule set for smart collections and the product join would come from the Admin API." },
    ],
    deep: [
      {
        title: "Manual vs. automated, in practice",
        everyday: [
          { t: "p", text: "Use **Manual** when you want full control — you hand-pick each product, good for a curated capsule. Use **Automated** when you want it to maintain itself — set a rule like every Eau de Parfum under $100, and new matching products join on their own. Automated saves time on big, rule-based groups; manual gives you the final say." },
        ],
        technical: [
          { t: "p", text: "In a live build, `automated` collections re-evaluate on product changes via webhooks, so membership drifts as the catalog changes. `manual` collections only change when you edit the pinned list. When migrating off the mock, the `products` count must become derived for `automated` (to stay correct) while `manual` can keep an explicit member list." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "inventory",
    title: "Inventory",
    category: "Catalog",
    everyday: [
      { t: "p", text: "The **Inventory** page tracks how much stock you actually have, broken down by where it is. The same product can have different amounts at the warehouse, the flagship store, and a popup — this page keeps them all straight so you do not oversell." },
      {
        t: "dl",
        items: [
          { term: "Item / SKU", def: "The product and its stock code." },
          { term: "Location", def: "Where the stock sits: **Main Warehouse**, **Flagship Store**, or **Airport Popup**." },
          { term: "On hand", def: "How many units are physically there." },
          { term: "Committed", def: "Units already promised to orders that have not shipped yet." },
          { term: "Available", def: "What you can still sell — on hand minus committed." },
          { term: "Reorder point", def: "The level at which you should restock." },
          { term: "Status", def: "**In stock**, **Low stock**, or **Out of stock**." },
        ],
      },
      { t: "ol", items: ["Open Catalog then Inventory.", "Search by item, SKU, or location.", "Watch the Available column, not just On hand — that is what you can really sell.", "When Available nears the Reorder point, restock.", "Update On hand after a delivery or a stock count."] },
      { t: "callout", tone: "warning", title: "Sell against Available, not On hand", text: "**On hand** counts everything in the building, but some is already spoken for by open orders. **Available** is the number that is safe to sell. Always trust Available." },
    ],
    technical: [
      { t: "p", text: "The inventory resource is keyed `inventory`; search covers `name`, `sku`, and `location`. Fields: `name`, `sku`, `location` (Main Warehouse / Flagship Store / Airport Popup), `onHand`, `committed`, `available`, `reorderPoint`, `status`." },
      { t: "ul", items: ["`status` is one of `in_stock`, `low`, or `out`.", "The intended invariant is `available = onHand - committed`.", "Each row is one SKU at one location, so a product spread across three sites is three rows."] },
      { t: "p", text: "KPIs: SKUs tracked (row count), Units on hand (`sum(onHand)`), Low stock (`status === 'low'`), and Out of stock (`status === 'out'`)." },
      { t: "callout", tone: "info", title: "Status is a stored field, not computed", text: "In the mock, `status` and `available` are editable and can be set inconsistently with `onHand`, `committed`, and `reorderPoint`. A real integration would derive `available` from `onHand - committed` and derive `status` by comparing `available` to `reorderPoint` and zero." },
      { t: "p", text: "Maps to Shopify inventory levels per location. `onHand`, `committed`, and `available` correspond to Shopify's on-hand, committed, and available inventory states synced from the Admin API." },
    ],
    deep: [
      {
        title: "Reorder point and how status should behave",
        everyday: [
          { t: "p", text: "The **reorder point** is your safety line. When Available drops to it, it is time to order more so you do not run out before the next delivery arrives. Set it higher for fast sellers and items with long restock times." },
          { t: "p", text: "As a rule of thumb: Available above the reorder point should read In stock; at or near it, Low stock; at zero, Out of stock." },
        ],
        technical: [
          { t: "p", text: "The correct derivation is: `out` when `available <= 0`, `low` when `0 < available <= reorderPoint`, otherwise `in_stock`. Because the mock lets `status` be edited by hand, the demo data may not perfectly satisfy this. When the Admin API integration lands, `status` should become a computed field and the drawer control removed or made read-only to prevent drift." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "stock-adjustments",
    title: "Stock Adjustments",
    category: "Catalog",
    everyday: [
      { t: "p", text: "A **stock adjustment** is the paper trail for stock that changed for a reason other than buying or selling — a stocktake found three more units than the system said, a bottle broke, a case expired, or samples went out for a promotion. Instead of silently editing a number, you record a document that says who changed what, where, and why." },
      {
        t: "dl",
        items: [
          { term: "Adjustment", def: "The document number (e.g. **SA-0001**), assigned automatically. The line under it shows the item being adjusted." },
          { term: "Status", def: "**Parked** means saved as a draft — stock has not moved yet and you can still edit or delete it. **Completed** means the change has been applied to your stock and the document is locked." },
          { term: "Reason", def: "Why the stock changed: stocktake variance, damaged, expired, promotion, shrinkage, stock received, or other." },
          { term: "Facility", def: "The store or warehouse where the adjustment applies." },
          { term: "Quantity", def: "Signed units: **+3** adds stock, **−12** removes it." },
          { term: "Created / Updated", def: "When the document was raised and last touched." },
        ],
      },
      { t: "ol", items: ["Open Catalog then Stock Adjustments and click New stock adjustment.", "Pick the item and the facility — both lists come straight from your store.", "Enter the signed quantity and pick the reason.", "Leave the status as Parked to save a draft, or set it to Completed to apply the change immediately.", "To apply a parked draft later, open it and change its status to Completed."] },
      { t: "callout", tone: "warning", title: "Completed means locked", text: "Completing an adjustment applies it to your live stock and freezes the document — it can never be edited or deleted afterwards, because it is part of your audit trail. Got it wrong? Raise a new adjustment in the opposite direction." },
    ],
    technical: [
      { t: "p", text: "The resource is keyed `stock-adjustments` and is **app-owned**: documents live in MongoDB (`app_stock_adjustments`) because Shopify has no adjustment-document concept — only per-item quantity deltas. Search covers `number`, `item`, `sku`, `facility`, and `reason`." },
      { t: "ul", items: ["Document numbers (`SA-XXXX`) come from an atomic counter collection (`app_counters`) — allocation can't produce duplicates.", "`number`, `createdAt`, `updatedAt`, and `completedAt` are server-generated; client values are ignored.", "Item and facility snapshots (`item`, `sku`, `facility`) are resolved from Shopify at save time from the submitted `itemId` / `facilityId`, so the stored names can't disagree with the ids.", "Completing posts the delta via the `inventoryAdjustQuantities` Admin API mutation (`name: available`), mapping the document reason onto Shopify's fixed reason codes and passing `suedebucks://stock-adjustments/SA-XXXX` as `referenceDocumentUri` so Shopify's ledger cross-references the document.", "Completion claims the document atomically (a `status: parked` filtered update), so concurrent submits can't post to Shopify twice; if Shopify rejects the post, the claim is released and the document stays parked.", "Completed documents are immutable — the API rejects update and delete, and the table shows a lock instead of row actions."] },
      { t: "p", text: "The item and facility selects are populated live from the `inventory` and `locations` resources via the form engine's `optionsFrom` mechanism, and the item list carries each variant's `inventoryItemId` — the id Shopify's inventory mutations require. Requires the `write_inventory` scope." },
      { t: "callout", tone: "info", title: "Modelled on Unleashed", text: "The screen mirrors the legacy Unleashed Software adjustments table: adjustment number, status, reason, facility, quantity, created and updated dates — with the same parked-to-completed lifecycle and locked-once-completed rule." },
    ],
  },

  // ==========================================================================
  {
    id: "categories",
    title: "Categories",
    category: "Catalog",
    everyday: [
      { t: "p", text: "**Categories** are the filing system for your catalog — the structure that says a product is an Eau de Parfum or a Candle. A tidy category tree makes products easy to browse and easy to find." },
      {
        t: "dl",
        items: [
          { term: "Name", def: "The category label, like Eau de Parfum." },
          { term: "Parent", def: "The category it sits under, if any. Leave blank for a top-level category." },
          { term: "Products", def: "How many products are filed in it." },
          { term: "Status", def: "**Active** (visible) or **Hidden** (kept but not shown)." },
        ],
      },
      { t: "ol", items: ["Open Catalog then Categories.", "Click New to add a category.", "Leave Parent empty for a main category, or name a parent to nest it.", "Save. Search by name or parent to find one.", "Hide a category instead of deleting it if you might use it again."] },
      { t: "callout", tone: "info", title: "Category is structure, Collection is marketing", text: "Think of **categories** as the aisles in a shop (where an item lives) and **collections** as the front-window displays (themed picks). A product has one category but can feature in many collections." },
    ],
    technical: [
      { t: "p", text: "The categories resource is keyed `categories`; search covers `name` and `parent`. Fields: `name`, `parent`, `products`, `status` (`active` / `hidden`), `updatedAt`, `description`." },
      { t: "ul", items: ["Hierarchy is expressed by the free-text `parent` field; a blank `parent` denotes a top-level category.", "`products` is a stored count in the mock.", "KPIs: Categories (count), Top level (`!parent`), Products classified (`sum(products)`), and Hidden (`status === 'hidden'`)."] },
      { t: "callout", tone: "warning", title: "Parent is a string, not a real reference", text: "The `parent` field is loose text, so it is not validated against an existing category and cannot enforce a true tree. A real integration would use category IDs and a proper taxonomy (Shopify's standard product taxonomy) rather than name matching." },
      { t: "p", text: "The product `category` select in the products resource (Eau de Parfum / Eau de Toilette / Extrait / Discovery Sets / Body & Bath / Home & Candles) is a separate fixed list and is not currently linked to rows created here — worth unifying when moving to real data." },
    ],
    deep: [
      {
        title: "Hidden categories keep the tree clean",
        everyday: [
          { t: "p", text: "If a category is off-season or being reorganised, set it to **Hidden** rather than deleting it. Hidden keeps the products' filing intact and lets you bring it back later without redoing the work. Deleting is permanent and can leave products without a home." },
        ],
        technical: [
          { t: "p", text: "`hidden` should exclude a category from customer-facing navigation while preserving its `products` associations. Deleting a category with children or products would orphan them — since `parent` is name-based there is no cascade protection in the mock, so avoid deletes on categories that have descendants until referential integrity exists." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "orders",
    title: "Orders",
    category: "Sales",
    everyday: [
      { t: "p", text: "The **Orders** page is every sale that has come in, online and in-store. Each row shows the order number, the customer, the total, whether it is paid, whether it has shipped, which channel it came through, and the date." },
      {
        t: "dl",
        items: [
          { term: "Order # / Customer", def: "The order's reference and who placed it." },
          { term: "Total", def: "The full amount charged." },
          { term: "Payment", def: "**Paid**, **Pending** (not yet paid), or **Refunded**." },
          { term: "Fulfillment", def: "**Fulfilled** (all shipped), **Partial** (some shipped), or **Unfulfilled** (nothing shipped yet)." },
          { term: "Channel", def: "**Online** (web store) or **POS** (bought in person)." },
          { term: "Items / Notes", def: "How many items are on the order, plus a notes box." },
        ],
      },
      { t: "ol", items: ["Open Sales then Orders.", "Sort by Fulfillment or filter with search to find what needs shipping.", "Click an order to see its details in the drawer.", "Once you have shipped it, update Fulfillment to Fulfilled.", "Add a note if anything about the order is unusual."] },
      { t: "callout", tone: "warning", title: "Unfulfilled orders are your to-do list", text: "The **Unfulfilled** count in the stat cards is work waiting on you. Clear it regularly so nothing that is paid for goes unshipped." },
    ],
    technical: [
      { t: "p", text: "The orders resource is keyed `orders`; search covers `number` and `customer`. Fields: `number`, `customer`, `total`, `items`, `payment`, `fulfillment`, `channel`, `createdAt`, `notes`." },
      { t: "ul", items: ["`payment` is one of `paid`, `pending`, or `refunded`.", "`fulfillment` is one of `fulfilled`, `partial`, or `unfulfilled`.", "`channel` is one of `online` or `pos`."] },
      { t: "p", text: "KPIs: Orders (count with delta), Revenue (`sum(total)` with delta), Unfulfilled (`fulfillment === 'unfulfilled'`), and Average order value (`sum(total) / count`)." },
      { t: "callout", tone: "info", title: "Payment and fulfilment are independent axes", text: "An order can be `paid` but `unfulfilled`, or `fulfilled` but `refunded`. The two statuses do not gate each other in the mock, so treat them as separate lifecycles rather than a single linear status." },
      { t: "p", text: "Maps to a Shopify `Order` with financial status (payment) and fulfilment status. `channel` maps to the sales channel (online store vs. Shopify POS). Transactions for an order live in the separate transactions resource, referenced by order number." },
    ],
    deep: [
      {
        title: "Worked example: a partly shipped order",
        everyday: [
          { t: "p", text: "Say a customer orders two bottles of perfume and a candle, but you only have the candle and one bottle in stock. You ship those two items now and mark the order **Partial**. When the second bottle arrives and you ship it, you change it to **Fulfilled**. Payment stays **Paid** throughout — shipping status and payment status move independently." },
        ],
        technical: [
          { t: "p", text: "Partial fulfilment implies line-level fulfilment state that the flat `fulfillment` field summarises. The mock stores only the roll-up (`partial`), not per-line quantities. A real Shopify order tracks fulfilments per line item and derives the order-level status; when integrating, expand this into line records so `partial` becomes computed rather than a hand-set label." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "draft-orders",
    title: "Draft orders",
    category: "Sales",
    everyday: [
      { t: "p", text: "A **Draft order** is an order you build yourself, before the customer pays — handy for phone orders, wholesale, or holding a cart for someone. You put it together, send an invoice, and it becomes a real order once they pay." },
      {
        t: "dl",
        items: [
          { term: "Draft # / Customer", def: "The draft's reference and who it is for." },
          { term: "Total", def: "The amount the draft comes to." },
          { term: "Status", def: "**Open** (still building), **Invoice sent** (waiting on payment), or **Completed** (paid and turned into an order)." },
          { term: "Created / Notes", def: "When it was started, plus a notes box." },
        ],
      },
      { t: "ol", items: ["Open Sales then Draft orders.", "Click New and add the customer and total.", "Leave it Open while you finalise the items.", "Send the invoice and set the status to Invoice sent.", "When they pay, mark it Completed."] },
      { t: "callout", tone: "info", title: "Drafts are not sales yet", text: "A draft does not count as revenue and does not reduce stock until it is **Completed**. Use the Pipeline value stat to see how much money is sitting in unfinished drafts." },
    ],
    technical: [
      { t: "p", text: "The draft-orders resource is keyed `draft-orders`; search covers `number` and `customer`. Fields: `number`, `customer`, `total`, `status`, `createdAt`, `notes`. `status` is one of `open`, `invoice_sent`, or `completed`." },
      { t: "ul", items: ["KPIs: Open drafts (`status === 'open'`), Pipeline value (`sum(total)` over all drafts), Invoices sent (`status === 'invoice_sent'`), and Completed (`status === 'completed'`)."] },
      { t: "callout", tone: "warning", title: "Completing a draft does not create an order here", text: "In the mock, marking a draft `completed` does not automatically add a row to the `orders` resource or decrement `inventory`. Those side effects would be handled by the Shopify Admin API's draft-order completion flow in production." },
      { t: "p", text: "Maps to a Shopify `DraftOrder`. `invoice_sent` corresponds to having emailed the invoice; completion converts the draft into a real order and captures or requests payment via the Admin API." },
    ],
    deep: [
      {
        title: "When to use a draft instead of a normal order",
        everyday: [
          { t: "p", text: "Reach for a draft when the sale is not a standard self-checkout: a customer phoning in an order, a wholesale buyer who needs an invoice, or holding items for someone who will pay later. For anything the shopper completes themselves online or at the till, a normal order is created automatically — you do not need a draft." },
        ],
        technical: [
          { t: "p", text: "Draft orders are the manual-entry path; standard orders arrive from the online store or POS channels. The Pipeline value KPI treats all drafts as potential revenue, but only `completed` drafts should ever roll into realised revenue — do not double-count a completed draft that has also produced an order once the completion side effect is wired up." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "transactions",
    title: "Transactions",
    category: "Sales",
    everyday: [
      { t: "p", text: "The **Transactions** page is the money trail behind your orders — every charge and refund, and whether it went through. Where Orders tells you what was sold, Transactions tells you what actually moved in and out of your account." },
      {
        t: "dl",
        items: [
          { term: "Reference / Order", def: "The transaction's ID and the order it belongs to." },
          { term: "Amount", def: "How much money moved." },
          { term: "Kind", def: "**Sale** (money in), **Refund** (money back to the customer), or **Authorization** (a hold before charging)." },
          { term: "Status", def: "**Success**, **Pending**, or **Failed**." },
          { term: "Gateway", def: "How it was paid: Shopify Payments, PayPal, or Cash." },
        ],
      },
      { t: "ol", items: ["Open Sales then Transactions.", "Search by reference, order, or gateway.", "Check the Status column for anything Failed or Pending.", "Use the Kind column to separate sales from refunds.", "Match a transaction to its order using the Order reference."] },
      { t: "callout", tone: "warning", title: "Watch for Failed and Pending payments", text: "A **Failed** transaction means money did not arrive — the order may look placed but is not actually paid. Follow up on Failed and long-Pending transactions so you are not shipping unpaid goods." },
    ],
    technical: [
      { t: "p", text: "The transactions resource is keyed `transactions`; search covers `ref`, `order`, and `gateway`. Fields: `ref`, `order`, `amount`, `kind`, `status`, `gateway`, `createdAt`." },
      { t: "ul", items: ["`kind` is one of `sale`, `refund`, or `authorization`.", "`status` is one of `success`, `pending`, or `failed`.", "`gateway` is one of Shopify Payments, PayPal, or Cash.", "`order` is a loose reference string linking to an order number."] },
      { t: "p", text: "KPIs: Gross volume (`sum(amount)` where `kind === 'sale'`), Refunds (`sum(amount)` where `kind === 'refund'`), Net (gross sales minus refunds), and Success rate (share of rows with `status === 'success'`)." },
      { t: "callout", tone: "info", title: "Authorizations are holds, not captures", text: "An `authorization` reserves funds without moving them; the actual charge is a later `sale` (capture). In the mock these are separate rows and are not automatically paired, so an authorization plus its capture can both appear against one order." },
      { t: "p", text: "Maps to Shopify order transactions (authorization, sale/capture, refund) across payment gateways. Net excludes authorizations because only captured sales and refunds represent settled money." },
    ],
    deep: [
      {
        title: "Sale, refund, authorization — the three kinds",
        everyday: [
          { t: "p", text: "A **Sale** is a completed charge — money in. A **Refund** returns money to the customer — money out. An **Authorization** is a temporary hold that checks the card is good and reserves the amount, but does not take it yet; the real charge follows. On card statements an authorization can look like a pending charge that later firms up or disappears." },
        ],
        technical: [
          { t: "p", text: "The Net KPI intentionally counts only `sale` minus `refund` and ignores `authorization`, since an uncaptured authorization has not settled. A `failed` sale contributes to Gross volume in the current naive `sum` because the KPI filters on `kind` but not `status` — when wiring real data, gate Gross volume on `status === 'success'` as well to avoid inflating settled revenue with failed attempts." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "abandoned",
    title: "Abandoned checkouts",
    category: "Sales",
    everyday: [
      { t: "p", text: "An **Abandoned checkout** is a cart a shopper started but did not finish — they got to checkout, then left without paying. This page lists those near-misses so you can win some of them back." },
      {
        t: "dl",
        items: [
          { term: "Customer", def: "The email of the person who abandoned the cart." },
          { term: "Cart value", def: "How much the unfinished order was worth." },
          { term: "Items", def: "How many items were in the cart." },
          { term: "Recovery", def: "**Not contacted**, **Email sent**, or **Recovered** (they came back and bought)." },
        ],
      },
      { t: "ol", items: ["Open Sales then Abandoned checkouts.", "Sort by Cart value to prioritise the biggest ones.", "Send a reminder to Not contacted shoppers and mark them Email sent.", "When one comes back and pays, mark it Recovered.", "Track your Recovery rate stat over time."] },
      { t: "callout", tone: "success", title: "Recovered carts are found money", text: "These shoppers already wanted to buy. A friendly reminder often brings them back — the **Recovery rate** stat shows how much of that lost revenue you are reclaiming." },
    ],
    technical: [
      { t: "p", text: "The abandoned resource is keyed `abandoned`; search covers `email`. Fields: `email`, `total`, `items`, `stage`, `createdAt`, `notes`. `stage` is one of `none`, `email_sent`, or `recovered`." },
      { t: "ul", items: ["KPIs: Abandoned carts (count), Potential revenue (`sum(total)`), Recovered (`stage === 'recovered'`), and Recovery rate (share recovered)."] },
      { t: "callout", tone: "info", title: "Recovery stage is set by hand here", text: "In the mock, `stage` is an editable field — there is no email service actually sending reminders and no checkout event flipping a cart to `recovered`. A real integration would drive `stage` from Shopify checkout webhooks and a marketing/email provider." },
      { t: "p", text: "Maps to Shopify abandoned checkouts. Under the Admin API, a recovered checkout would be linked to the resulting order, and the recovery URL / email automation would advance `stage` automatically." },
    ],
    deep: [
      {
        title: "The recovery funnel: none, email sent, recovered",
        everyday: [
          { t: "p", text: "Think of it as three steps. **Not contacted** is a fresh abandonment you have not acted on. **Email sent** means you have nudged them. **Recovered** means the nudge worked and they completed the purchase. Your goal is to move carts down that path — and the higher your recovery rate, the more of that almost-lost money you keep." },
        ],
        technical: [
          { t: "p", text: "The three `stage` values form a simple funnel. Recovery rate divides `recovered` by total rows, so carts still at `none` or `email_sent` sit in the denominator and drag the rate down until resolved. When automated, you would typically also age out very old abandonments so the rate reflects the active recovery window rather than all history." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "pos",
    title: "POS overview",
    category: "Point of Sale",
    everyday: [
      { t: "p", text: "**Point of Sale** (POS) is everything about selling face to face in your physical shops, as opposed to online. This area ties together the tills, the places you sell from, and the people allowed to ring up sales." },
      { t: "p", text: "It has three pages that work together:" },
      {
        t: "dl",
        items: [
          { term: "Registers", def: "The individual tills — each one is opened, run for the day, and closed with its cash counted." },
          { term: "Locations", def: "The physical places you sell from or store stock: stores, warehouses, and popups." },
          { term: "POS staff", def: "The team members who can sell in person, each with a role and a PIN." },
        ],
      },
      { t: "ol", items: ["Set up your Locations first — the stores and popups you operate.", "Add your POS staff and give them roles and PINs.", "Open a Register at a location to start taking sales.", "Ring up in-person sales; they appear in Orders with the POS channel.", "Close the register at end of day and reconcile the cash."] },
      { t: "callout", tone: "info", title: "In-store sales flow into the same Orders list", text: "A sale rung up at a register shows in **Orders** with the **POS** channel, right alongside your online orders. POS is where the selling happens; Orders is where every sale lands." },
    ],
    technical: [
      { t: "p", text: "Point of Sale groups three resources in `src/config/resources.ts`: `registers`, `locations`, and `pos-staff`. They share the same table-plus-drawer engine as every other resource and are all backed by the in-memory store." },
      { t: "ul", items: ["POS sales surface in the `orders` resource with `channel === 'pos'`.", "Registers reference a location and the staff member who opened them (`openedBy`).", "Staff and registers both key off the location list, though the location option sets are hard-coded per resource in the config rather than joined to the `locations` rows."] },
      { t: "callout", tone: "warning", title: "Location lists are duplicated, not linked", text: "The location dropdowns on registers (`Flagship Store` / `Airport Popup` / `Downtown Kiosk`), inventory (`Main Warehouse` / `Flagship Store` / `Airport Popup`), and staff are static option arrays in the config. They are not foreign keys into the `locations` resource, so adding a location there does not populate these dropdowns. Unifying them is a follow-up for the real integration." },
      { t: "p", text: "Maps conceptually to Shopify POS: locations, POS staff members with permissions/PINs, and register/till sessions. In production these would sync from Shopify POS and the Admin API rather than being seeded." },
    ],
    deep: [
      {
        title: "How a POS sale differs from an online sale",
        everyday: [
          { t: "p", text: "The main differences are who rings it up and how it is paid. In store, a staff member scans items at a register and often takes cash, so the till's cash drawer has to balance at the end of the day. Online, the shopper checks out themselves and pays by card. Both end up as orders — but only POS sales involve a physical register and a cash count." },
        ],
        technical: [
          { t: "p", text: "POS orders carry `channel === 'pos'` and are attributable to a register (and its `openedBy` staff), and their cash portion contributes to that register's `sales` and drawer reconciliation. Online orders carry `channel === 'online'` and have no register association. When integrating, POS transactions should link order, register session, staff member, and location together — a graph the flat mock only approximates via loose reference strings." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "registers",
    title: "Registers",
    category: "Point of Sale",
    everyday: [
      { t: "p", text: "A **Register** is a till — the point where a staff member rings up in-person sales. You open it at the start of a shift with a starting amount of cash, take sales through it during the day, and close it at the end when you count the drawer." },
      {
        t: "dl",
        items: [
          { term: "Register name", def: "A label for the till, like Front Desk 1." },
          { term: "Location", def: "Which store or popup the till is at." },
          { term: "Status", def: "**Open** (taking sales now) or **Closed** (shift ended)." },
          { term: "Cash float", def: "The starting cash put in the drawer so you can give change." },
          { term: "Sales today", def: "How much this till has sold today." },
          { term: "Opened by", def: "The staff member who started the session." },
        ],
      },
      { t: "ol", items: ["Open Point of Sale then Registers.", "Click New or open an existing till.", "Set the location, the cash float, and who is opening it.", "Set the status to Open to start selling.", "At end of shift, set it to Closed and reconcile the cash."] },
      { t: "callout", tone: "warning", title: "Set the cash float before you open", text: "The **cash float** is the change you start the drawer with. Getting it right matters — when you close, the drawer should equal the float plus cash sales. A wrong float makes the till look short or over." },
    ],
    technical: [
      { t: "p", text: "The registers resource is keyed `registers`; search covers `name`, `location`, and `openedBy`. Fields: `name`, `location` (Flagship Store / Airport Popup / Downtown Kiosk), `status` (`open` / `closed`), `openedBy`, `cashFloat`, `sales`." },
      { t: "ul", items: ["KPIs: Open registers (`status === 'open'`), Cash in drawers (`sum(cashFloat)` over open registers), POS sales today (`sum(sales)` with delta), and Registers (row count)."] },
      { t: "callout", tone: "info", title: "Sessions are a single row, not a log", text: "Each register is one row carrying its current `status`, `cashFloat`, and `sales`. There is no historical session log or open/close audit trail in the mock — closing a register just flips the field. A real POS integration would record discrete till sessions with open/close times, expected vs. counted cash, and variance." },
      { t: "p", text: "`openedBy` is a free-text staff name rather than a reference into `pos-staff`. Maps to Shopify POS register/cash-tracking sessions." },
    ],
    deep: [
      {
        title: "Reconciling the drawer at close",
        everyday: [
          { t: "p", text: "At the end of a shift, count the cash in the drawer. It should equal the cash float you started with plus any cash sales taken (minus any cash refunds or payouts). If it does not match, the till is short or over, and it is worth checking receipts to find why. Only then set the register to Closed." },
        ],
        technical: [
          { t: "p", text: "Reconciliation logic — expected drawer = `cashFloat` + cash-tender sales - cash refunds — is not modelled in the mock; `sales` is a single figure not split by tender type, so cash vs. card cannot be separated here. When integrating with Shopify POS, pull tender breakdowns and record counted cash against expected to compute variance per session." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "locations",
    title: "Locations",
    category: "Point of Sale",
    everyday: [
      { t: "p", text: "**Locations** are the physical places your business operates from — your stores, your warehouse, and any temporary popups. They anchor where stock is held and where in-person sales happen." },
      {
        t: "dl",
        items: [
          { term: "Name", def: "What you call the place, like Flagship Store." },
          { term: "Type", def: "**Retail** (a shop), **Warehouse** (storage), or **Popup** (temporary)." },
          { term: "Status", def: "**Active** (in use) or **Inactive** (closed for now)." },
          { term: "Address / City / Country", def: "Where it is." },
          { term: "Inventory value", def: "How much stock, in money, is held there." },
        ],
      },
      { t: "ol", items: ["Open Point of Sale then Locations.", "Click New to add a store, warehouse, or popup.", "Set its type and address, and mark it Active.", "Search by name, address, or city to find one.", "Set a closed site to Inactive rather than deleting it."] },
      { t: "callout", tone: "info", title: "Locations connect stock and selling", text: "Your **Inventory** is counted per location and your **Registers** open at a location. Setting these up first gives the rest of the POS area somewhere to hang." },
    ],
    technical: [
      { t: "p", text: "The locations resource is keyed `locations`; search covers `name`, `address`, and `city`. Fields: `name`, `type` (`retail` / `warehouse` / `popup`), `status` (`active` / `inactive`), `address`, `city`, `country`, `inventoryValue`." },
      { t: "ul", items: ["KPIs: Locations (count), Active (`status === 'active'`), Retail (`type === 'retail'`), and Warehouses (`type === 'warehouse'`)."] },
      { t: "callout", tone: "warning", title: "Not yet the source of truth for other dropdowns", text: "As noted under POS overview, the location option lists on `inventory`, `registers`, and `pos-staff` are hard-coded and do not read from these rows. So `inventoryValue` here is a stored figure, not the sum of the inventory rows tagged to this location." },
      { t: "p", text: "Maps to Shopify locations, which underpin inventory levels and POS. Under the Admin API, `inventoryValue` would be derived from inventory at that location, and the loose location strings elsewhere would become references to these IDs." },
    ],
    deep: [
      {
        title: "Retail, warehouse, popup — why the type matters",
        everyday: [
          { t: "p", text: "The **type** tells the shop what to expect from a place. A **retail** location sells to customers and usually has a register. A **warehouse** holds stock but does not sell over a counter. A **popup** is temporary — a market stall or a short-term space — so you might set it Inactive between events. Tagging types correctly keeps your reports and stock in the right buckets." },
        ],
        technical: [
          { t: "p", text: "`type` should influence downstream behaviour: warehouses feed fulfilment and inventory but need no register; retail and popup locations host register sessions. Popups map naturally to the `popup` register/location values used in the config. In the mock these are just labels; a real integration would use type to decide whether a location can host POS sessions and appear as a fulfilment source." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "pos-staff",
    title: "POS staff",
    category: "Point of Sale",
    everyday: [
      { t: "p", text: "**POS staff** are the people allowed to sell in your physical shops. Each person has a role that sets what they can do and a PIN they use to sign in at the register." },
      {
        t: "dl",
        items: [
          { term: "Full name / Email", def: "Who they are and how to reach them." },
          { term: "Role", def: "**Manager**, **Associate**, or **Cashier** — from most to least access." },
          { term: "Location", def: "Which store or popup they work at." },
          { term: "PIN", def: "A short code they enter at the till to identify themselves." },
          { term: "Status", def: "**Active** (can sell) or **Suspended** (blocked for now)." },
        ],
      },
      { t: "ol", items: ["Open Point of Sale then POS staff.", "Click New to add a team member.", "Set their role, location, and a PIN.", "Mark them Active so they can sign in at a register.", "Suspend someone instead of deleting them if they are only away temporarily."] },
      { t: "callout", tone: "warning", title: "PINs are keys — keep them private", text: "A **PIN** lets someone ring up sales under their name. Give each person their own, do not share them, and **Suspend** anyone who leaves so their PIN stops working." },
    ],
    technical: [
      { t: "p", text: "The pos-staff resource is keyed `pos-staff`; search covers `name`, `email`, and `location`. Fields: `name`, `email`, `role` (`manager` / `associate` / `cashier`), `location` (Flagship Store / Airport Popup / Downtown Kiosk), `pin`, `status` (`active` / `suspended`)." },
      { t: "ul", items: ["KPIs: Staff (count), Active (`status === 'active'`), Managers (`role === 'manager'`), and Locations covered (distinct `location` values)."] },
      { t: "callout", tone: "warning", title: "PINs are stored in plain fields here", text: "The `pin` is an ordinary text field in the mock store, in the clear. This is fine for a demo but is not how credentials should be handled — a real integration would delegate POS authentication and PIN management to Shopify POS rather than storing PINs locally." },
      { t: "p", text: "Distinct from the app's single admin login: POS staff are a data resource, not sessioned dashboard users. Dashboard access is the one `sb_session`-cookie admin account (see the overview). Maps to Shopify POS staff members and their role permissions." },
    ],
    deep: [
      {
        title: "Roles: manager vs. associate vs. cashier",
        everyday: [
          { t: "p", text: "Roles set how much someone can do. A **Manager** has the widest access — think approving discounts, refunds, and opening or closing tills. An **Associate** handles everyday selling. A **Cashier** is the most limited, focused on ringing up sales. Give people the lowest role that lets them do their job — it keeps things tidy and safe." },
        ],
        technical: [
          { t: "p", text: "The three roles form a permission hierarchy (`manager` > `associate` > `cashier`). The mock does not enforce any capability gating from `role` — it is a label used for the Managers KPI. Under Shopify POS, role maps to a permission set governing refunds, discounts, and register management; enforcement would move to the POS platform, not this dashboard." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "settings",
    title: "Settings",
    category: "System",
    everyday: [
      { t: "p", text: "**Settings** is where you manage your account and how the shop is configured — the behind-the-scenes options rather than day-to-day selling. It is also where you sign out." },
      { t: "p", text: "Things you typically handle here:" },
      {
        t: "ul",
        items: [
          "Your profile and the account you log in with.",
          "Shop-wide preferences and defaults.",
          "Checking the connection status to your store.",
          "Logging out when you are done.",
        ],
      },
      { t: "p", text: "Many pages also have their own small settings button in the top bar for options that apply just to that page — for example how a table is displayed. Those are separate from this main Settings area." },
      { t: "callout", tone: "warning", title: "Only one login runs this dashboard", text: "This shop uses a single administrator account. Keep those credentials safe — anyone with them can see and change everything. Always log out on shared computers." },
    ],
    technical: [
      { t: "p", text: "Settings covers account and system configuration rather than a seeded resource collection. The central fact of the auth model lives here: the dashboard is protected by a single admin account, not a multi-user system." },
      { t: "h", text: "Auth and session model" },
      { t: "ul", items: ["Credentials are checked against the `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables.", "A successful login issues a signed HMAC cookie named `sb_session` with a 7-day expiry.", "`src/proxy.ts` guards `/dashboard/*`, redirecting unauthenticated requests to `/login`.", "Logout clears `sb_session`."] },
      { t: "p", text: "The user menu in the top bar exposes the current profile and role and the logout action. Per-page settings buttons in the top bar control view-level preferences local to a resource page and are unrelated to this account-level configuration." },
      { t: "callout", tone: "info", title: "Configuration is not persisted server-side yet", text: "Like the resource data, any preferences you change live in the in-memory store for the session. Store-level settings (taxes, shipping, payment gateways) would move to Shopify's settings under a real Admin API integration." },
    ],
    deep: [
      {
        title: "What happens when your session expires",
        everyday: [
          { t: "p", text: "Your login stays valid for seven days. After that — or if you log out — the dashboard sends you back to the sign-in screen. Just log in again to continue. This is normal security, not a bug." },
        ],
        technical: [
          { t: "p", text: "The `sb_session` cookie carries a 7-day expiry; once it lapses or fails HMAC verification, `src/proxy.ts` bounces the next `/dashboard/*` request to `/login`. Because there is no refresh flow, an expired session simply requires re-authentication. In-memory store state is also lost at that point, since it never left the browser." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "integrations",
    title: "Integrations",
    category: "System",
    everyday: [
      { t: "p", text: "The **Integrations** page is where you connect SuedeBucks to outside services — most importantly your **Shopify** store, so your real products, orders, and customers flow into this dashboard instead of the demo data." },
      { t: "p", text: "To connect Shopify you need three things: your store's address, and a **Client ID** and **Client Secret** — an ID-and-password pair that belongs to an app you create once in Shopify's developer dashboard. SuedeBucks uses that pair to fetch its own short-lived keys automatically, so there is no permanent master key to lose." },
      {
        t: "ol",
        items: [
          "Go to the **Shopify Dev Dashboard** (dev.shopify.com), sign in with the account that owns the Peirama store, and create a new app for SuedeBucks.",
          "In the app's configuration, grant it the access scopes — the **Integrations page lists the exact scopes** with a copy button — and install the app on your store.",
          "Copy the app's **Client ID** and **Client Secret** from its settings page.",
          "Back here, open **Integrations**, keep the method on **Client credentials**, enter your 'yourstore.myshopify.com' address, paste the ID and Secret, and press **Connect Shopify**.",
          "The page immediately tests the connection and shows the store name it reached. Use **Test connection** any time to re-check.",
        ],
      },
      {
        t: "dl",
        items: [
          { term: "Store domain", def: "Your technical Shopify address ending in '.myshopify.com' — not your public website address." },
          { term: "Client ID / Client Secret", def: "The app's identity and its password. SuedeBucks trades them for temporary access keys automatically. Treat the Secret like a password." },
          { term: "Legacy admin token", def: "The old method — a permanent 'shpat_' key from the retired custom-apps flow. Only use this if your store still has one from before." },
          { term: "Test connection", def: "A quick check that the address and credentials still work." },
          { term: "Disconnect", def: "Deletes the stored credentials from SuedeBucks. Your Shopify store itself is untouched." },
        ],
      },
      { t: "callout", tone: "warning", title: "Why there is no permanent token anymore", text: "Shopify retired the old admin-created apps that handed out permanent 'shpat_' tokens. The current model exchanges your Client ID + Secret for short-lived keys that expire and are refreshed automatically — safer, because a leaked key goes stale on its own. You never manage those keys; SuedeBucks does." },
    ],
    technical: [
      { t: "p", text: "The Integrations page (`/dashboard/integrations`) manages credentials for external services. Shopify is the first-class integration; the connection targets the **Admin GraphQL API** at `https://{store}.myshopify.com/admin/api/{version}/graphql.json`." },
      {
        t: "ul",
        items: [
          "Primary auth is the OAuth **client credentials grant**: `POST /admin/oauth/access_token` with `grant_type: \"client_credentials\"` exchanges the stored `clientId`/`clientSecret` for a short-lived Admin token. `resolveAccessToken()` caches it with a 60s expiry margin and re-mints on demand; a `legacy admin_token` method is kept for stores that still hold a permanent `shpat_` key.",
          "Config persists server-side: to the **MongoDB** `integrations` collection when `MONGODB_URI` is set (`src/lib/db.ts`), else to `.data/integrations.json` as a no-database fallback for local dev.",
          "A reusable Admin GraphQL client lives at `src/lib/shopify-client.ts` (`shopifyQuery(query, variables)`) — it resolves/auto-refreshes tokens and normalizes errors; all future Shopify reads/writes go through it.",
          "All mutations are **server actions** (`src/lib/integration-actions.ts`): `connectShopifyAction`, `testShopifyAction`, `disconnectShopifyAction`. Each re-verifies the session first.",
          "Raw secrets never reach the client: the page maps config through `toView()`, which masks the Client Secret (or legacy token) to prefix + last 4 characters and exposes only whether a cached access token is still fresh.",
          "Connection testing resolves a token, then runs a minimal `{ shop { name currencyCode } }` GraphQL query with an 8s timeout; 400/401 on the token exchange maps to a credentials/install error, 401/403 on GraphQL to a scope error.",
          "Domain input is normalized (protocol/path stripped, lowercased) and validated against `*.myshopify.com`.",
        ],
      },
      { t: "callout", tone: "info", title: "This stores credentials, it does not yet sync data", text: "Connecting here validates and saves credentials — the resource pages still read the mock store. Wiring list/detail reads to the Shopify Admin API is Phase 3 of the migration plan, and this page provides the credentials that phase will consume." },
    ],
    deep: [
      {
        title: "Client credentials vs. the old token — what changed",
        everyday: [
          { t: "p", text: "It used to work like a house key: Shopify handed you one permanent key ('shpat_…') and you gave it to trusted software. If that key ever leaked, it worked forever until someone noticed. The new way works like a hotel: SuedeBucks shows its ID at the desk (the Client ID and Secret) and gets a room key that expires on its own. Lose a room key and it stops working by itself; the ID card stays safely behind the counter here on the server." },
          { t: "p", text: "If your store was set up years ago you may still hold one of the old permanent keys — the **Legacy admin token** option accepts it. But expect Shopify to retire those entirely; moving to client credentials now saves a scramble later." },
        ],
        technical: [
          { t: "p", text: "Shopify retired admin-created custom apps and their permanent offline tokens. Apps are now created in the **Dev Dashboard** and authenticate with OAuth 2.0 grants. For a single-merchant backend like this one, the **client credentials grant** is the fit: no authorization redirect, no public callback URL, no app-store review — the server posts `client_id` + `client_secret` + `grant_type=client_credentials` to `/admin/oauth/access_token` and receives a short-lived Admin API token (`expires_in` seconds)." },
          { t: "p", text: "Implementation notes: tokens are cached in the integration record (`cachedToken.expiresAt`, minted with a 60-second safety margin) and re-minted lazily on the next API call after expiry — there is no refresh token in this grant, you simply re-run the exchange. If SuedeBucks is later distributed to many merchants, swap this page's form for the authorization-code install flow with HMAC-verified callbacks; `resolveAccessToken()` is the single seam where that change lands." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "glossary",
    title: "Glossary",
    category: "Reference",
    everyday: [
      { t: "p", text: "Plain-language definitions of the terms used across the dashboard. When a word on a page is unfamiliar, look it up here." },
      {
        t: "dl",
        items: [
          { term: "SuedeBucks vs. Peirama", def: "SuedeBucks is the store-management system (the software); Peirama is the store this installation is white-labelled for (the business you are running)." },
          { term: "White-label", def: "One product rebranded and deployed for a specific client. SuedeBucks is white-labelled as Peirama here." },
          { term: "SKU", def: "Stock Keeping Unit — your unique code for one exact product, used to track its stock." },
          { term: "Product vs. variant", def: "A product is an item you sell (a fragrance); a variant is a specific version of it (50ml, 100ml). This app currently treats each product as a single row." },
          { term: "Collection", def: "A curated, themed group of products for merchandising, like a Summer edit." },
          { term: "Category", def: "The structural bucket a product belongs to (Eau de Parfum, Extrait). Structure, not marketing." },
          { term: "Segment", def: "A named group of customers who share a trait, used for targeting offers." },
          { term: "On hand", def: "Units physically present at a location." },
          { term: "Committed", def: "Units already promised to orders that have not shipped." },
          { term: "Available", def: "Units you can still sell — on hand minus committed. Always sell against this." },
          { term: "Reorder point", def: "The stock level at which you should restock before running out." },
          { term: "Fulfillment", def: "Getting an order to the customer. An order can be fulfilled, partial, or unfulfilled." },
          { term: "Draft order", def: "An order you build manually before payment, for phone or wholesale sales." },
          { term: "Abandoned checkout", def: "A cart a shopper started at checkout but did not pay for." },
          { term: "Transaction", def: "A single movement of money — a sale, a refund, or an authorization." },
          { term: "Authorization", def: "A temporary hold on a card that reserves funds before the actual charge." },
          { term: "Gateway", def: "The service that processes a payment, such as Shopify Payments, PayPal, or Cash." },
          { term: "POS", def: "Point of Sale — selling to customers in person at a physical location." },
          { term: "Register", def: "A till where in-person sales are rung up, opened and closed each shift." },
          { term: "Cash float", def: "The starting cash placed in a register drawer so you can give change." },
          { term: "KPI", def: "Key Performance Indicator — a headline number, shown in the stat cards at the top of each page." },
        ],
      },
      { t: "callout", tone: "info", title: "Two lookalike pairs to remember", text: "**Collection vs. Category**: curated marketing group vs. structural bucket. **On hand vs. Available**: everything in the building vs. what is actually safe to sell." },
    ],
    technical: [
      { t: "p", text: "Field- and status-level reference for the values used across `src/config/resources.ts`. These are the literal strings stored on rows in the mock (and the shapes a Shopify Admin API integration would map onto)." },
      {
        t: "dl",
        items: [
          { term: "products.status", def: "`active`, `draft`, or `archived`. Only `active` is customer-visible." },
          { term: "orders.payment", def: "`paid`, `pending`, or `refunded` — the financial status." },
          { term: "orders.fulfillment", def: "`fulfilled`, `partial`, or `unfulfilled` — the shipping status. Independent of payment." },
          { term: "orders.channel", def: "`online` or `pos` — where the sale originated." },
          { term: "inventory.status", def: "`in_stock`, `low`, or `out`; alongside `onHand`, `committed`, `available`, `reorderPoint`." },
          { term: "transactions.kind", def: "`sale`, `refund`, or `authorization`." },
          { term: "transactions.status", def: "`success`, `pending`, or `failed`." },
          { term: "discounts.type", def: "`percentage`, `fixed`, `bogo`, or `shipping`." },
          { term: "discounts.status", def: "`active`, `scheduled`, or `expired`." },
          { term: "abandoned.stage", def: "`none`, `email_sent`, or `recovered` — the recovery funnel." },
          { term: "registers.status", def: "`open` or `closed`, with `cashFloat`, `sales`, and `openedBy`." },
          { term: "locations.type", def: "`retail`, `warehouse`, or `popup`; `status` is `active` or `inactive`." },
          { term: "pos-staff.role", def: "`manager`, `associate`, or `cashier`; `status` is `active` or `suspended`; plus `pin`." },
          { term: "sb_session", def: "The signed HMAC auth cookie (7-day expiry) checked by `src/proxy.ts` on `/dashboard/*`." },
          { term: "ADMIN_USERNAME / ADMIN_PASSWORD", def: "Env vars holding the single admin credential the login form checks against." },
          { term: "Mock store", def: "`src/lib/seed.ts` (seed) and `src/lib/store.tsx` (React state) — in-memory data, resets on reload." },
        ],
      },
      { t: "callout", tone: "warning", title: "These states are stored, not always derived", text: "Several statuses (inventory `status`, discount `status`, abandoned `stage`) are hand-editable fields in the mock and can be set inconsistently with their underlying numbers or dates. A real integration would compute them from source data via the Shopify Admin API and webhooks." },
    ],
  },
];
