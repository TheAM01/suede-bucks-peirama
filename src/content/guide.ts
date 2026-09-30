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
          { term: "Sales", def: "Money coming in: **Orders**, **Draft orders**, **Returns**, **Dispatch**, **Transactions**, and **Abandoned checkouts**." },
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
          { term: "Members", def: "The customers in the group. Pick them from the searchable list when you create or edit the segment — the count on the row is simply how many you picked." },
          { term: "Growth %", def: "Whether the group is getting bigger or smaller lately." },
          { term: "Status", def: "**Active** (in use) or **Draft** (still being set up)." },
        ],
      },
      { t: "ol", items: ["Open Relations then Segments.", "Click New to create a group, or click a row to edit one.", "Give it a name and description so your team knows who it targets.", "Under Members, search your customers and tick everyone who belongs in the group.", "Save it as Draft while you refine it, then set it Active when ready.", "Use an Active segment when setting up a discount or a campaign."] },
      { t: "callout", tone: "info", title: "Segments group people, collections group products", text: "It is easy to mix these up. A **segment** is a set of customers. A **collection** is a set of products. If you are grouping shoppers, you are in the right place." },
    ],
    technical: [
      { t: "p", text: "The segments resource is keyed `segments`; search covers `name` and `description`. Fields are `name`, `description`, `customerIds`, `growth`, `status`, and `updatedAt`. `status` is `active` or `draft`." },
      { t: "ul", items: ["Membership is an explicit list: `customerIds` holds the Shopify customer ids picked in the `multiselect` field. Segments are app-owned (MongoDB), customers are Shopify-backed, so the join is by stored id.", "`members` is derived, never stored — `src/lib/app-data.ts` sets it to `customerIds.length` on every read and strips any client-sent value on write, so the count can't drift from the list.", "`growth` is a percentage figure shown in the Growth column, and is still hand-entered.", "KPIs: Segments (count), Total reach (`sum(members)`), Largest segment (`max(members)`), and Average size (`sum(members) / count`)."] },
      { t: "callout", tone: "info", title: "Membership is manual, not rule-driven", text: "You choose members explicitly. A segment does not carry a query, so it will not pick up new customers on its own — a shopper who starts matching the segment's intent later has to be added by hand. Shopify's own customer segments are rule-driven; that is a different model this does not implement." },
      { t: "callout", tone: "warning", title: "Deleted customers linger as ids", text: "`customerIds` stores ids, not snapshots. If a customer is deleted in Shopify, their id stays on the segment and the picker reports it as “no longer listed” rather than dropping it silently. The `members` count still includes it until you clear it." },
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
      { t: "p", text: "The **Orders** page is every sale that has come in, online and in-store, read live from Shopify. Each row shows the order number, the customer, where they are, which courier is carrying it, whether it is paid, whether it has shipped, which channel it came through, the money breakdown, any tags, and the date." },
      { t: "p", text: "Above the table, tabs let you filter by **Order status** — the stage the order is at in your own workflow: **Exception**, **Pending CC**, **Active**, **Packaged**, **Booking Failed**, **Finalized**, **In Pickup & Packing**, **Dispatched**, plus Fulfilled, Delivered, Returned, Canceled, Draft, Duplicate, and On Hold. This is separate from Shopify's own Payment and Fulfillment columns — an order can be Shopify-`Fulfilled` and still sit in your own `Returned` bucket if that's where the operational workflow has it." },
      { t: "h", text: "Where new orders land" },
      { t: "p", text: "The moment an order is placed, its shipping address is checked for problems a courier would trip over — a blank or very short address, placeholder text like \"test\", keyboard mashing, a run of the same letter, only the city name, a missing city, or a missing or unusable phone number. Then it's filed automatically:" },
      { t: "ul", items: [
        "**Exception** — the address has a problem. Fix it before anything ships.",
        "**Pending CC** — the address is fine but the customer paid only by **bank deposit**, so it waits until the deposit has cleared.",
        "**Active** — the address is fine and it's paid another way (PayFast, cash on delivery, ...). Ready to pack.",
      ] },
      { t: "h", text: "The control panel" },
      { t: "p", text: "Tick one or more orders from the same tab and a **control panel** appears at the bottom of the screen with only the actions that make sense for that tab:" },
      {
        t: "dl",
        items: [
          { term: "Exception", def: "**Modify** (fix the address), **Move to Active**, or **Discard**. Moving an order you haven't modified asks first: \"This order was flagged as malformed. Are you sure you want to move it into active orders?\" — once you've modified it, it moves straight away." },
          { term: "Pending CC", def: "**Deposit cleared → Active** once the money is in, **Modify**, or **Discard**." },
          { term: "Active", def: "**Create Package** (hands it to the packing team), **Modify**, **Move to Exceptions**, or **Discard**." },
          { term: "Packaged", def: "**Assign consignment** — book it with **Insta** (out of city) or enter the ID from the **manual Karachi courier**. **Back to Active** undoes the package." },
          { term: "Booking Failed", def: "Insta couldn't book it — the reason is shown on the order. Try again, or book it in Insta's portal and enter the consignment ID by hand." },
          { term: "Finalized", def: "**Print shipping label** (a QR code with the consignment ID, plus the customer's name, address, phone, and the cash to collect), or **Cancel** — cancelling a finalized order needs a reason." },
          { term: "In Pickup & Packing", def: "The label is printed. **Dispatch** when the courier takes it (or use **Scan to dispatch**), reprint the label, or **Cancel pickup** to send it back to Finalized. Dispatch asks which **load sheet** the parcels go on — the courier's open draft sheet (the default, started automatically if there isn't one), another draft sheet for that courier, or a brand-new sheet." },
          { term: "Dispatched", def: "The **Load sheet** column shows which sheet each parcel is on. Orders dispatched before load sheets were automatic have none — tick them and press **Add to load sheet**. For the **manual Karachi courier** only: **Mark fulfilled** once the rider has delivered it — the order is marked fulfilled in Shopify too (with the consignment ID as its tracking number, no email to the customer) and moves to **Fulfilled**. Insta orders have no manual step here." },
        ],
      },
      { t: "callout", tone: "info", title: "Modify saves only when you confirm", text: "Editing an order's address or note opens a form that shows, as you type, whether the address still looks wrong. Nothing is saved until you press **Save changes** and confirm — then the change is written to the Shopify order itself." },
      { t: "callout", tone: "info", title: "Discard doesn't touch Shopify", text: "Discarding an order moves it to **Canceled** here only. The Shopify order is not cancelled or refunded — do that in Shopify if you need to." },
      { t: "callout", tone: "success", title: "Scan to dispatch", text: "The **Scan to dispatch** button next to the tabs opens a scanner box. Point a barcode scanner at each printed label (or type the consignment ID and press Enter) and each order is marked **Dispatched** on the spot, onto its courier's open draft load sheet." },
      { t: "callout", tone: "info", title: "Every dispatched parcel is on a load sheet", text: "However an order is dispatched — the button, a scan, or a phone scan of its label — it lands on a load sheet for its courier, and that sheet's parcel count, total, and cash-on-delivery grow with it. Sheets start as **Draft**; post the sheet on the Dispatch page when the rider leaves." },
      { t: "callout", tone: "success", title: "Scan a label with your phone", text: "The QR on every label is a link to this app. Scan it with a phone camera (signed in — it asks you to sign in first if not) and the order moves to its next stage automatically: a **Finalized** parcel goes to **In Pickup & Packing**, a parcel **In Pickup & Packing** is **Dispatched**, and a **Dispatched** manual-courier parcel scanned again by the rider on delivery is **Fulfilled**. The page shows the order number and the move it made." },
      { t: "callout", tone: "warning", title: "Print labels from the live site", text: "The QR link points at whichever web address the labels were printed from. Print them from the public site, not from a computer's localhost, or phones won't be able to open the link." },
      {
        t: "dl",
        items: [
          { term: "Order # / Customer", def: "The order's reference and who placed it." },
          { term: "Order status", def: "Your own operational stage for the order — also which tab it appears under. Change it with the control panel." },
          { term: "City / Courier", def: "The shipping destination city, and the courier it's booked with (or, before booking, whichever courier's tracking is on the Shopify shipment)." },
          { term: "Consignment", def: "The courier's consignment ID once assigned — the same code that's in the label's QR. You can search by it." },
          { term: "Payment", def: "**Paid**, **Pending** (not yet paid), or **Refunded**." },
          { term: "Fulfillment", def: "**Fulfilled** (all shipped), **Partial** (some shipped), or **Unfulfilled** (nothing shipped yet)." },
          { term: "Channel", def: "**Online** (web store) or **POS** (bought in person)." },
          { term: "Amount / Disc. / Shipping / Net Total", def: "The line-item subtotal, discount applied, shipping charged, and the final total actually charged." },
          { term: "Gateway", def: "How the order was paid — e.g. Cash on Delivery, a payment processor's name." },
          { term: "Tags", def: "Any tags on the order in Shopify — used by whatever apps or staff workflow adds them (e.g. a COD-confirmation or risk-flagging app)." },
          { term: "Qty / Notes", def: "How many items are on the order, plus a notes box." },
        ],
      },
      { t: "p", text: "Karachi deliveries with the manual courier finish with one more step: when the rider confirms delivery, tick the order in **Dispatched** and press **Mark fulfilled** (or have the rider scan the label). Shopify then shows the order as fulfilled." },
      { t: "ol", items: ["Open Sales then Orders and start with the **Exception** tab: tick each order, **Modify** the address, then **Move to Active**.", "Check **Pending CC** — when a bank deposit has cleared, tick the order and press **Deposit cleared → Active**.", "In **Active**, tick what's ready and press **Create Package**. The order moves to **Packaged** and gets a `packaged` tag in Shopify so the packing team can find it there too.", "In **Packaged**, press **Assign consignment**: Insta for out-of-city orders, the manual courier (type the ID) for Karachi.", "In **Finalized**, press **Print shipping label**. The labels open in a new tab, ready to print, and the orders move to **In Pickup & Packing**.", "When the courier collects, press **Dispatch**, use **Scan to dispatch**, or scan the whole batch into a load sheet on the Dispatch page."] },
      { t: "callout", tone: "info", title: "Click an order to see every step", text: "The list only has room for the current status. Opening an order shows its **Timeline** — placed, each payment, each shipment with its tracking number (in transit, delivered), refunds, and cancellation — mixed with every step of your own workflow (intake, modifications, packaging, label printing, dispatch), newest first. A **Workflow** card shows the current tab, any address flags, the courier, consignment, cash to collect, and a link to the label." },
      { t: "callout", tone: "warning", title: "Unfulfilled orders are your to-do list", text: "The **Unfulfilled** count in the stat cards is work waiting on you. Clear it regularly so nothing that is paid for goes unshipped." },
      { t: "callout", tone: "warning", title: "Order status needs a database connection to save", text: "Unlike everything else on this page (which is read live from Shopify), Order status is stored separately in this app's own database. Without MongoDB connected, the control panel can't move orders — the tabs will still work, but every order will show as Active until a database is reachable." },
      { t: "callout", tone: "warning", title: "Automatic filing needs the order webhook", text: "New orders are only checked and filed into Exception / Pending CC / Active if the order webhook is registered on the **Integrations** page. Orders placed before that (or while it wasn't registered) show up as **Active** without an address check." },
    ],
    technical: [
      { t: "p", text: "The orders resource is keyed `orders`; search covers `number`, `customer`, and `consignmentId`; the `loadSheet` column comes from the ops overlay. Row shape: `number`, `customer`, `opsStatus`, `city`, `courier`, `gateway`, `tags`, `amount`, `discount`, `shipping`, `total`, `items`, `payment`, `fulfillment`, `channel`, `createdAt`, `notes`. `number`, `customer`, `total`, `items`, `opsStatus`, `payment`, `fulfillment`, `channel`, `createdAt`, and `notes` are in `fields` (and therefore editable in the drawer). `city`/`courier`/`gateway`/`tags`/`amount`/`discount`/`shipping` are `columns`-only, display derived straight from Shopify on every read — `SHOPIFY_WRITERS.orders.update` only ever sends `note` to Shopify; `opsStatus` is the one editable field that goes somewhere else entirely (see below)." },
      { t: "ul", items: ["`payment` is one of `paid`, `pending`, or `refunded`.", "`fulfillment` is one of `fulfilled`, `partial`, or `unfulfilled`.", "`channel` is one of `online` or `pos`.", "`tags` renders with the new `\"tags\"` `ColumnType` — up to 3 badge chips plus a `+N` overflow badge, added in `resource-view.tsx` alongside the existing `\"status\"`/`\"index\"` types."] },
      { t: "p", text: "KPIs: Orders (count with delta), Revenue (`sum(total)` with delta), Unfulfilled (`fulfillment === 'unfulfilled'`), and Average order value (`sum(total) / count`)." },
      { t: "callout", tone: "info", title: "Payment and fulfilment are independent axes", text: "An order can be `paid` but `unfulfilled`, or `fulfilled` but `refunded`. The two statuses do not gate each other, so treat them as separate lifecycles rather than a single linear status." },
      { t: "p", text: "Maps to a Shopify `Order`. `payment`/`fulfillment` come from `displayFinancialStatus`/`displayFulfillmentStatus`; `channel` from `sourceName`; `city` from `shippingAddress.city`; `courier` from the first fulfillment's `trackingInfo.company` (native Shopify tracking data, not a separately-assigned field — an order with no fulfillment yet shows no courier); `gateway` from `paymentGatewayNames`; `amount`/`discount`/`shipping`/`total` from `subtotalPriceSet`/`totalDiscountsSet`/`totalShippingPriceSet`/`totalPriceSet` respectively; `tags` from the order's own Shopify tags verbatim (whatever wrote them — this app never writes tags itself). Transactions for an order live in the separate transactions resource, referenced by order number." },
      { t: "p", text: "The row list carries only two snapshot enums (`displayFinancialStatus`, `displayFulfillmentStatus`) plus the summary fields above. The full history behind them is a separate per-order read: `orders` declares `rowHref`, so a row click routes to `/dashboard/orders/[id]`, which fetches `/api/orders/[id]` → `readOrderDetail()` in `src/lib/shopify-order-detail.ts`." },
      { t: "ul", items: ["That one GraphQL query pulls `lineItems`, `fulfillments` (with `trackingInfo`), `transactions`, `refunds`, and Shopify's `events` log.", "`buildTimeline()` merges every dated record into one list sorted newest-first, tagged by kind (`placed`, `payment`, `fulfillment`, `delivery`, `refund`, `cancelled`, `event`) which drives the icon and accent per step.", "It is read-only and fetched per visit — no local history is stored, so the timeline is exactly what Shopify reports at that moment.", "Needs the `read_orders` and `read_fulfillments` scopes; a scope or schema failure surfaces as an error card, never partial or invented history."] },
      { t: "p", text: "`opsStatus` is the operational status layer: an app-owned overlay in `src/lib/order-ops.ts`, MongoDB collection `app_order_ops`, **one document per order that has ever been touched, keyed by the Shopify order id as `_id`** — a plain upsert, not the ObjectId-per-row pattern `app-data.ts` uses elsewhere. An order with no document reads as `active`, the default. `GET /api/resources/orders` calls `attachOrderOps()` to merge it onto every row after the Shopify read; `PATCH /api/resources/orders/[id]` calls both `SHOPIFY_WRITERS.orders.update()` (the `note` field, to Shopify) and `setOrderOps()` (the `opsStatus` field, to Mongo) from the same edit — two independent backends updated by one form submit, a pattern that didn't exist anywhere else in the resource engine before this." },
      { t: "h", text: "The order workflow" },
      { t: "p", text: "Everything beyond a plain status lives in the same `app_order_ops` document (`OrderOpsDoc` in `src/lib/order-ops.ts`): `flags` (address issues from the latest check), `modified` (edited since it last entered Exception), `courier`, `consignmentId` (unique partial index — scanning resolves through it), `bookingError`, `codAmount`/`total`/`number` (snapshot taken at Create Package), `labelPrintedAt`, `dispatchedAt`, `loadSheet`, `cancelReason`, and an append-only `history` of `{ at, action, from, to, note }`. No customer PII is stored — names and addresses are always read live from Shopify." },
      { t: "ul", items: [
        "**Intake**: `POST /api/webhooks/orders-create` (Shopify `orders/create`, HMAC-verified with the app's client secret) → `intakeFromWebhook()` in `src/lib/order-workflow.ts` → `checkAddress()` + `routeNewOrder()` in `src/lib/address-check.ts` → `intakeOrder()`, a `$setOnInsert` upsert, so webhook retries never overwrite a status staff already changed. POS orders are skipped. Routing: any address issue → `exception`; every payment gateway matches `/bank|deposit|transfer|ibft/i` → `pending_cc`; otherwise `active`.",
        "**Transitions**: `ACTION_FROM` in `src/config/order-workflow.ts` is the single table of which action is allowed from which status — the control panel reads it to pick buttons, and `runOrderAction()` enforces it server-side via `POST /api/orders/[id]/actions` (`{ action, ...payload }`).",
        "`applyTransition()` is a compare-and-set: `updateOne({ _id, opsStatus: from })`, with `upsert` only when `from` is the default `active` (orders without a document). A lost race surfaces as \"status changed in the meantime\" rather than a double transition.",
        "`move_active` from `exception` without `modified` returns `409 { needsConfirmation }` (the malformed-order message); the client asks, then resends with `confirmed: true`.",
        "`modify` writes `orderUpdate` with a new `shippingAddress` (`MailingAddressInput`; `provinceCode`/`countryCode` passed through unchanged) plus `note`, then re-runs `checkAddress()` and stores the result as `flags`.",
        "`create_package` reads `readOrderBrief()` (number, `totalPriceSet`, `totalOutstandingSet` → `codAmount`) and adds the Shopify tag `packaged` via `tagsAdd`; `unpackage` removes it via `tagsRemove`.",
        "`assign_consignment`: `{ courier, consignmentId }` for a manual ID (4–40 of `[A-Za-z0-9-]`), or `{ courier, useApi: true }` to call the courier's adapter in `src/lib/courier-booking.ts`. A failed API booking moves the order to `booking_failed` with `bookingError`. **Insta's adapter is a stub** that always fails with an explanatory message until its API is implemented there.",
        "`print_label` → `in_pickup_packing` (a reprint from there just logs). Labels render at `/print/labels?ids=...` (outside `/dashboard` so no chrome prints; gated in `src/proxy.ts` and by a session check). The QR is generated server-side with the `qrcode` package (see the scan-link item below for what it encodes).",
        "`dispatch` → `dispatched`, from the button, `POST /api/consignments/[consignmentId]` (scan-to-dispatch), or a scanned load sheet. Every dispatch puts the parcel on a load sheet: `payload.target` is `\"auto\"` (default — the courier's newest Draft sheet, opened if none), `\"new\"`, or a Draft sheet's id (same courier), resolved by `resolveLoadSheet()` in `src/lib/dispatch.ts` under a per-courier in-process lock so a batch can't open several automatic sheets. The order stores the sheet `reference` as `loadSheet`; `attachToLoadSheet()` then `$push`es the consignment and `$inc`s the sheet's `totalShipments`/`totalAmount`/`codAmount` (guarded by `consignmentIds: { $ne }`, so it's idempotent). The control panel dispatches one order at a time, reusing the first `loadSheetId` returned per courier when the target is `\"new\"`.",
        "`add_to_load_sheet` (from `dispatched`, only when `loadSheet` is empty) does the same sheet resolution + attach without changing status — for orders dispatched before sheets were automatic.",
        "`mark_fulfilled` → `fulfilled`, **manual courier only**: `canRun(action, status, courier)` rejects it unless `courier === MANUAL_COURIER`. It calls `fulfillOrder()` in `src/lib/shopify-writes.ts`: reads the order's `fulfillmentOrders`, then one `fulfillmentCreate` over every `OPEN`/`IN_PROGRESS` one with `trackingInfo { company: courier, number: consignmentId }` and `notifyCustomer: false`; nothing left open counts as success, so retries are safe. Needs the `read_merchant_managed_fulfillment_orders` / `write_merchant_managed_fulfillment_orders` scopes (now in `SHOPIFY_SCOPES_REQUIRED`). Stamps `fulfilledAt`.",
        "**Label QR = a link**: labels encode `<origin>/scan/<consignmentId>` (`scanPath()`), origin taken from the request's `host` / `x-forwarded-*` headers. `/scan/[consignmentId]` (gated by `src/proxy.ts` and a session check; login now honours the `next` param, same-site paths only) renders `ScanAdvance`, which POSTs `{ advance: true }` to `/api/consignments/[consignmentId]` once after load — never on the GET, so link previews and prefetches can't move orders; a ref guard stops Strict Mode's double effect from advancing twice. The endpoint maps the current status through `SCAN_ADVANCE` (`finalized` → `print_label`, `in_pickup_packing` → `dispatch`, `dispatched` → `mark_fulfilled`). The in-app keyboard-wedge scanners strip the URL back to the id with `consignmentFromScan()`, so old bare-id labels still work.",
        "`cancel` from `in_pickup_packing` → back to `finalized` (clears `labelPrintedAt`); from `finalized` it requires `reason` → `canceled`, stores `cancelReason`, and unsets `consignmentId` so the old label can't be scanned.",
        "`discard` → `canceled` locally; Shopify is not touched.",
      ] },
      { t: "p", text: "`/dashboard/orders` is now a literal route (`src/app/dashboard/orders/page.tsx` → `OrdersView`) wrapping the generic `ResourceView` with two new optional props: `toolbar` (the Scan to dispatch button) and `selectionBar`, which replaces the generic bulk bar with `OrderControlPanel` (`src/components/dashboard/order-control-panel.tsx`). The order detail page merges `ops.history` (returned alongside the order by `GET /api/orders/[id]`) into the Shopify timeline as `ops`-kind steps." },
      { t: "callout", tone: "info", title: "A deliberate simplification of a richer real-world model", text: "Reference systems that run this kind of order-status tab bar (checked live against one) actually track this as multiple independent badges — a shipping-pipeline stage (Draft → Packaged → Fulfilled → Delivered), payment state, and a separate exception/return flag that can be true regardless of pipeline stage. Concretely: an order can show `Fulfilled` on its shipping badge while still being filed under a `Returned` tab, because the return is tracked independently of whether it physically shipped. This app instead uses one flat `opsStatus` per order — every tab is mutually exclusive. That's simpler to build and use, but means an order can't simultaneously be, say, `Fulfilled` and `Returned` here the way it could in a system with layered status fields. If that turns out to matter, the fix is splitting `opsStatus` into a pipeline-stage field plus a separate boolean-ish exception field, both stored in the same `app_order_ops` document." },
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
    id: "returns",
    title: "Returns",
    category: "Sales",
    everyday: [
      { t: "p", text: "The **Returns** page is where you track merchandise customers send back — from the moment a return is requested through refund and restock. It shares one page with **Dispatch** (a switch at the top flips between the two) because both are about a shipment's life after the sale, just moving in opposite directions." },
      {
        t: "dl",
        items: [
          { term: "RMA #", def: "The return's own reference number, e.g. **RMA001** — you assign this yourself when you open the return." },
          { term: "Order", def: "The original order number this return belongs to, and the customer underneath it." },
          { term: "Reason", def: "Why it's coming back — **Damaged**, **Wrong item**, **Changed mind**, **Defective**, **Late delivery**, or **Other**." },
          { term: "Status", def: "**Requested → Approved → In Transit → Received → Refunded**, or **Rejected** if you decline it — also which tab it appears under." },
          { term: "Refund Amount", def: "How much is being (or was) refunded to the customer." },
          { term: "Restock Location", def: "Which store or warehouse the item goes back into once received." },
        ],
      },
      { t: "ol", items: ["Open Sales then Returns (or flip to it from the Dispatch switch).", "Click New return and enter the RMA #, order #, and reason.", "Set Approved once you've agreed to take it back, and pick a pickup courier if one is collecting it.", "Move it to In Transit once it's on its way, then Received once it's back in hand.", "Set the refund amount and mark it Refunded once the money has gone back — or Rejected if you're declining the return."] },
      { t: "callout", tone: "info", title: "Restocking isn't automatic yet", text: "Setting Restock Location records where the item should go back into stock, but it doesn't yet post an inventory adjustment the way completing a Stock Adjustment does. Update Inventory separately for now." },
    ],
    technical: [
      { t: "p", text: "The resource is keyed `returns` and is **app-owned**: stored in MongoDB (`app_returns`) via the generic `src/lib/app-data.ts` CRUD path (`APP_OWNED_COLLECTIONS`), same as `registers` or `segments` — unlike `dispatch`, it doesn't need a server-generated reference number or a one-way timestamp, so it doesn't need its own module. Search covers `reference`, `orderNumber`, and `customer`." },
      { t: "ul", items: [
        "`status` drives the resource's `tabs` config: `requested`, `approved`, `in_transit`, `received`, `refunded`, `rejected` — six stages instead of dispatch's three, because a return has more real-world checkpoints (pickup, arrival, settlement) than a load sheet does.",
        "`reason` and `status` are independent `status`-type fields with their own badge variants — a return can be `Damaged` and still sit in any status.",
        "`refundAmount` is a plain hand-entered currency field; there is no link back to the original order's Shopify refund/transaction record, so it can drift from what's actually been refunded in Shopify if not kept in sync.",
        "`restockLocation` and `courier` reuse the same `LOCATION_OPTIONS` / `COURIER_OPTIONS` arrays `dispatch` uses, defined once in `src/config/resources.ts` rather than duplicated per resource.",
      ] },
      { t: "callout", tone: "warning", title: "No link to Shopify's own refund records", text: "This is a standalone operational tracker, not a mirror of Shopify's refund/return objects — it doesn't read or write anything on the Shopify order. If a return here and a Shopify refund disagree, Shopify's transaction record is the source of truth for what money actually moved." },
    ],
  },

  // ==========================================================================
  {
    id: "dispatch",
    title: "Dispatch",
    category: "Sales",
    everyday: [
      { t: "p", text: "The **Dispatch** page is your courier handover book. When a batch of orders is ready to leave a location with a courier, you group them into a **load sheet** — one document that says which courier is collecting, how many shipments, their combined value and weight, and any cash-on-delivery (COD) being carried." },
      { t: "p", text: "Sheets move through three stages, shown as tabs at the top of the table: **Draft** (still being put together), **Posted** (handed to the courier), and **Archived** (kept for records once settled)." },
      { t: "callout", tone: "info", title: "Shares a page with Returns", text: "A switch at the top of this page flips between Dispatch and Returns — outgoing and incoming shipments, side by side. Each keeps its own tabs, table, and stats; only the top-level switch is shared." },
      {
        t: "dl",
        items: [
          { term: "Reference/ID", def: "The sheet's number, like **LS001**, assigned automatically in order." },
          { term: "Courier", def: "Which courier company is collecting this sheet." },
          { term: "Location", def: "The store or warehouse the shipments are leaving from." },
          { term: "Status", def: "**Draft**, **Posted**, or **Archived** — also which tab the sheet appears under." },
          { term: "Reconciliation", def: "**Pending** or **Reconciled** — whether the COD cash this sheet's courier collected has been settled back to you." },
          { term: "Total Shipments", def: "How many orders/parcels are on this sheet." },
          { term: "Total Amount", def: "The combined value of everything on the sheet." },
          { term: "COD Amount", def: "How much of that total the courier is collecting in cash on delivery." },
          { term: "Weight", def: "The sheet's combined weight." },
          { term: "Consignments", def: "On scanned sheets, every consignment ID that was scanned onto it." },
          { term: "Date Created / Date Posted", def: "When the sheet was started, and when it was handed to the courier." },
        ],
      },
      { t: "callout", tone: "info", title: "Dispatched orders fill sheets automatically", text: "When orders are dispatched from the Orders page (button or scan), they're added to their courier's open **Draft** sheet — one is started automatically if there isn't one, dispatching from the **Main Warehouse**. The sheet's shipment count, total, and COD update with every parcel. When the rider leaves, open the sheet and set it to **Posted**." },
      { t: "callout", tone: "success", title: "Scan a load sheet", text: "Or build a sheet at the door: press **Scan load sheet**, pick the courier and location, and scan every parcel's label as you hand it over. Each scan adds the order and its cash-on-delivery amount; the running total of parcels and COD is shown at the bottom. **Create load sheet** posts it straight away, lists every consignment on it, and marks each order **Dispatched**. Parcels must have a printed label (In Pickup & Packing), or already be Dispatched but not yet on any sheet, and be booked with the same courier." },
      { t: "callout", tone: "warning", title: "Sheets with parcels can't be deleted", text: "Orders remember which sheet they left on, so a sheet that has parcels on it can't be deleted — archive it instead." },
      { t: "ol", items: ["Open Sales then Dispatch.", "Click New load sheet and pick the courier and location (or use Scan load sheet, above).", "Fill in the shipment count, total amount, COD amount, and weight.", "Leave it as Draft while you are still assembling it.", "Set it to Posted once the courier has physically collected it — this stamps Date Posted.", "Once the courier settles the COD cash with you, set Reconciliation to Reconciled.", "Move settled, old sheets to Archived to keep the Posted tab focused on what is still outstanding."] },
      { t: "callout", tone: "warning", title: "Posting stamps the date and doesn't reset", text: "Date Posted is set the moment a sheet first becomes Posted. Archiving it afterwards does not clear or change that date — it's a permanent record of when it left." },
    ],
    technical: [
      { t: "p", text: "The resource is keyed `dispatch` and is **app-owned**: load sheets live in MongoDB (`app_dispatch_load_sheets`) via `src/lib/dispatch.ts`, following the same pattern as `stock-adjustments` rather than the generic `app-data.ts` CRUD path, because it needs server-generated reference numbers and a one-way status timestamp. Search covers `reference`, `courier`, and `location`." },
      { t: "ul", items: [
        "`reference` (`LS001`, `LS002`, ...) comes from an atomic counter in `app_counters` (counter id `dispatch`), zero-padded to 3 digits — never duplicated, same mechanism as `stock-adjustments`' `SA-XXXX` numbers.",
        "`status` is one of `draft`, `posted`, or `archived`, driving the resource's `tabs` config (`ResourceConfig.tabs`) — a segmented All/Draft/Posted/Archived filter rendered by `resource-view.tsx` above the table.",
        "`reconciliation` is `pending` or `reconciled`, independent of `status` — a sheet can be Posted and still Pending reconciliation.",
        "`totalShipments`, `totalAmount`, and `codAmount` start at whatever is entered, then grow automatically as dispatched parcels are attached (`attachToLoadSheet()`), alongside a `consignmentIds` array (a `tags` column). They stay editable in the drawer; `weight` is hand-entered only.",
        "`deleteLoadSheet()` refuses a sheet whose `consignmentIds` isn't empty — orders reference it by `loadSheet`.",
        "`createdAt` is set server-side at creation; `datePosted` is stamped server-side the first time `status` becomes `posted` and is never overwritten by later edits (including a later `archived` transition) — enforced in `updateLoadSheet()` by checking `!existing.datePosted` before setting it.",
        "`courier` and `location` are plain `select` fields (fixed option lists), not `optionsFrom` a live resource — dispatch doesn't post anything to Shopify, so it doesn't need a real location GID the way `stock-adjustments`' facility field does.",
        "`/dashboard/dispatch` and `/dashboard/returns` are both literal route files rendering the same `DispatchReturnsView` client component (`src/components/dashboard/dispatch-returns-view.tsx`), which puts a `Segmented` switch above a `key`-remounted `ResourceView` for whichever resource (`dispatch` or `returns`) is active. Switching the segment calls `router.replace()` to the other URL so the sidebar highlight and the bottom bar's guide link — both driven by `pathname` — stay correct without a full navigation.",
      ] },
      { t: "p", text: "**Scanned sheets**: `POST /api/dispatch/scan-sheet` (`{ courier, location, consignmentIds }`) → `createScannedLoadSheet()` in `src/lib/load-sheet-scan.ts` (kept out of `dispatch.ts` because it calls `runOrderAction()`, and `order-workflow.ts` itself imports `dispatch.ts`). Each consignment is resolved through `app_order_ops` (`findByConsignment()`) and must be `in_pickup_packing`, or `dispatched` with no `loadSheet`, and booked with the sheet's courier. A new Draft sheet is opened, every parcel goes through `runOrderAction(id, \"dispatch\" | \"add_to_load_sheet\", { target: sheetId })` — so totals come from each order's Create Package snapshot, never the client — and then `postLoadSheet()` posts it. The scanner UI (`ScanLoadSheetButton` in `src/components/dashboard/scanners.tsx`) looks each code up first with `GET /api/consignments/[consignmentId]` and rejects duplicates, parcels in the wrong stage, and parcels booked with a different courier. Scanners are keyboard-wedge: a focused input that submits on Enter." },
      { t: "p", text: "The `#` column uses the new `\"index\"` `ColumnType` — a display-only row-position number (1, 2, 3, ...) computed from the sorted/filtered/paginated row list in `resource-view.tsx`, not a stored field. `Date Created` / `Date Posted` use the new `\"datetime\"` `ColumnType` (`formatDateTime()`), which is why they render with a time (e.g. `Jul 30, 2026, 4:20 PM`) unlike the date-only columns elsewhere." },
      { t: "callout", tone: "info", title: "Modelled on courier load sheets, terminology may evolve", text: "The **Reconciliation** field is a best-guess interpretation (whether courier-collected COD has been settled with the store) — if your courier workflow means something different by it, the field and its options in `src/config/resources.ts` are easy to relabel." },
    ],
    deep: [
      {
        title: "Why Dispatch has tabs and most other pages don't",
        everyday: [
          { t: "p", text: "Most pages just show you everything in one table. Dispatch adds tabs (All, Draft, Posted, Archived) because a courier handover naturally moves through those three stages and you usually only care about one at a time — for example, only what's still sitting in Draft waiting to go out." },
        ],
        technical: [
          { t: "p", text: "`ResourceConfig.tabs` (`{ field, options }`) is a small generic addition to the resource engine, not a Dispatch-only hack: any resource can opt in by setting `tabs` in `src/config/resources.ts`, and `resource-view.tsx` renders the `Segmented` control and filters `rows[field]` accordingly, on top of (not instead of) the existing search and per-column sort. The KPI row is intentionally unaffected by the active tab — stats always compute over the full row set, same as search." },
        ],
      },
    ],
  },

  // ==========================================================================
  {
    id: "return-load-sheets",
    title: "Return Load Sheets",
    category: "Sales",
    everyday: [
      { t: "p", text: "**Return Load Sheets** is Dispatch's mirror image — instead of grouping shipments going out with a courier, it groups returns a courier is handing back to you. Same idea, same fields, opposite direction: Draft while you're expecting it, Posted once the courier hands it over, Archived once it's settled." },
      { t: "ol", items: ["Open Sales then Return Load Sheets.", "Click New load sheet and pick the courier and location it's coming into.", "Leave it Draft while you're expecting the handover.", "Set it to Posted once the courier has physically handed the returns over — this stamps Date Posted.", "Once any COD implications are settled against Dispatch, set Reconciliation to Reconciled.", "Move old settled sheets to Archived."] },
    ],
    technical: [
      { t: "p", text: "The resource is keyed `return-load-sheets`. `src/lib/dispatch.ts` was generalized from a `dispatch`-only module into a `LoadSheetResource`-parameterized one (`\"dispatch\" | \"return-load-sheets\"`) rather than duplicated — same functions, a different Mongo collection (`app_return_load_sheets`), counter id, and reference prefix (`RL001`, `RL002`, ... instead of `LS001`) per direction. The API routes (`route.ts` / `[id]/route.ts`) pass the resource key straight through to `listLoadSheets()` / `createLoadSheet()` / `updateLoadSheet()` / `deleteLoadSheet()`." },
      { t: "p", text: "Field/column/stat shape is otherwise identical to `dispatch` (see that guide entry) — same `tabs` (`draft`/`posted`/`archived`), same `LOCATION_OPTIONS` / `COURIER_OPTIONS` reuse, same one-way `datePosted` stamp." },
    ],
  },

  // ==========================================================================
  {
    id: "leads",
    title: "Leads",
    category: "Sales",
    everyday: [
      { t: "p", text: "**Leads** tracks prospective wholesale/B2B buyers before they become customers — name, company, how they found you, and where they are in your sales process." },
      {
        t: "dl",
        items: [
          { term: "Lead / Company", def: "Who the contact is and which business they're with." },
          { term: "Source", def: "How they found you — Website, WhatsApp, Referral, Social, Walk-in, or Other." },
          { term: "Status", def: "**New → Contacted → Qualified → Converted**, or **Lost**." },
          { term: "Assigned To", def: "Which staff member owns following up with this lead." },
        ],
      },
      { t: "ol", items: ["Open Sales then Leads.", "Click New and fill in the contact and how they reached you.", "Assign it to whoever should follow up.", "Move it through Contacted → Qualified as the conversation progresses.", "Mark it Converted once they place an order, or Lost if it goes nowhere."] },
      { t: "callout", tone: "warning", title: "No automatic conversion", text: "Marking a lead Converted doesn't create a customer or order record — that's a manual judgement call for now, not a wired-up side effect." },
    ],
    technical: [
      { t: "p", text: "The resource is keyed `leads`, app-owned via `src/lib/app-data.ts` (`APP_OWNED_COLLECTIONS.leads = \"app_leads\"`). Search covers `name`, `company`, and `email`. `source` and `status` are independent `status`-type fields; `status` drives `tabs`." },
      { t: "callout", tone: "warning", title: "Field set is a reasonable guess, not a verified copy", text: "Unlike every other page added alongside this one, Leads' exact columns weren't confirmed against a live reference screen — the page kept getting intercepted by a duplicate sidebar link during a live walkthrough of the system this app is modelled on, and it was judged not worth blocking the rest of the work over. The fields here (source, status pipeline, assigned-to) are a standard CRM-lead shape, not a checked copy. Treat this one as the most likely to need adjusting once you can see the real page." },
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
      { t: "p", text: "One setting here is **Dashboard view**, with two options:" },
      {
        t: "dl",
        items: [
          { term: "New", def: "Shows every page in the sidebar — the full set described in the Platform overview." },
          { term: "Legacy", def: "Shows only the original page set plus Returns and Dispatch: Dashboard, Analytics, Customers, Products, Inventory, Stock Adjustments, Orders, Draft Orders, Returns, Dispatch, Settings, Integrations, and Guide. Everything else (Segments, Discounts, Collections, Categories, Transactions, Abandoned Checkouts, and all of Point of Sale) is hidden from the sidebar." },
        ],
      },
      { t: "callout", tone: "info", title: "Legacy hides pages, it doesn't lock them", text: "Switching to **Legacy** only tidies the sidebar. A hidden page is still there if you type its address directly — nothing is disabled, so links and bookmarks to it keep working." },
      { t: "callout", tone: "warning", title: "Only one login runs this dashboard", text: "This shop uses a single administrator account. Keep those credentials safe — anyone with them can see and change everything. Always log out on shared computers." },
    ],
    technical: [
      { t: "p", text: "Settings covers account and system configuration rather than a seeded resource collection. The central fact of the auth model lives here: the dashboard is protected by a single admin account, not a multi-user system." },
      { t: "h", text: "Dashboard view (Legacy / New)" },
      { t: "p", text: "`src/lib/dashboard-view.ts` defines the `DashboardView` type (`\"legacy\" | \"new\"`) and `LEGACY_VISIBLE_HREFS`, the fixed set of hrefs shown in Legacy mode. `DashboardViewProvider` (`src/components/dashboard-view-provider.tsx`) persists the choice to `localStorage` under `suedebucks:dashboard-view`, mounted in `DashboardShell` alongside `CurrencyProvider` — same client-only, no-backend pattern as the currency setting." },
      { t: "ul", items: [
        "`Sidebar` reads `useDashboardView()` and, in `legacy` mode, filters each `NavCategory`'s `items` down to hrefs in `LEGACY_VISIBLE_HREFS`, then drops any category left with zero items (e.g. Point of Sale disappears entirely, since none of its four pages are on the legacy list).",
        "Filtering happens only in the sidebar's render — routes, API endpoints, and `RESOURCE_KEYS` are untouched, so a hidden page's URL, its guide slug, and direct links to it all keep working.",
        "The setting is edited on this page via `useDashboardView().setView()`, a plain `Select` bound to `\"legacy\" | \"new\"`.",
      ] },
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
      { t: "callout", tone: "info", title: "Register the order webhook", text: "Once Shopify is connected, press **Register webhook** (with the app's public web address, not localhost). From then on every new order is checked and filed into the right Orders tab — Exception, Pending CC, or Active — the moment it's placed." },
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
      { t: "callout", tone: "warning", title: "\"This app is not approved to access the Order object\"", text: "If pages that touch customer or order data (Orders, Customers) show this error even with a working connection, it isn't a scope problem — it's Shopify's separate **Protected Customer Data** approval. Any field that's personally identifiable (name, email, phone, address) is blocked app-wide until you request access in the **Partner Dashboard** (Apps → your app → API access → Protected customer data access → Request access). For a custom app built for one store, that's usually approved within minutes to a day, not a long review." },
    ],
    technical: [
      { t: "p", text: "**Order intake webhook**: once connected, the page shows a **Register webhook** control. `registerOrderWebhookAction()` in `src/lib/integration-actions.ts` checks for an existing `ORDERS_CREATE` subscription to `<origin>/api/webhooks/orders-create` and otherwise calls `webhookSubscriptionCreate(topic: ORDERS_CREATE, webhookSubscription: { uri })`. The origin must be public HTTPS (localhost is rejected — Shopify can't deliver there), and deliveries are HMAC-verified with the stored client secret, so this needs the client-credentials connection method." },
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
      {
        t: "ul",
        items: [
          "Three mandatory GDPR compliance webhooks live at `src/app/api/webhooks/{customers-data-request,customers-redact,shop-redact}/route.ts`, backed by `src/lib/shopify-webhooks.ts`. Required by Shopify's API Terms for every app, and checked as part of Protected Customer Data approval.",
          "Each handler reads the **raw** request body (`req.text()`, not `req.json()`) and verifies it against the `x-shopify-hmac-sha256` header using `verifyShopifyWebhook()` — HMAC-SHA256 of the raw bytes with the app's `clientSecret`, base64-compared with `timingSafeEqual`. A missing/invalid signature is a 401 before the payload is ever parsed.",
          "This app never persists customer PII of its own — everything is read live from Shopify. `customers/data_request` just logs and acknowledges (nothing to furnish). `customers/redact` drops the customer's id from every segment's `customerIds` list (`redactCustomer()`) — the only place a customer's id is stored at all. `shop/redact` clears every app-owned Mongo collection (`redactShop()`) — this app is single-tenant, so \"the shop's data\" is everything app-owned, not a filtered subset.",
        ],
      },
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
          { term: "Load sheet", def: "A courier handover document grouping the shipments leaving a location together, on the Dispatch page." },
          { term: "COD", def: "Cash on delivery — payment the courier collects from the customer at drop-off, rather than in advance." },
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
          { term: "dispatch.status", def: "`draft`, `posted`, or `archived` — also the resource's tab filter. `reconciliation` is `pending` or `reconciled`, independent of `status`." },
          { term: "sb_session", def: "The signed HMAC auth cookie (7-day expiry) checked by `src/proxy.ts` on `/dashboard/*`." },
          { term: "ADMIN_USERNAME / ADMIN_PASSWORD", def: "Env vars holding the single admin credential the login form checks against." },
          { term: "Mock store", def: "`src/lib/seed.ts` (seed) and `src/lib/store.tsx` (React state) — in-memory data, resets on reload." },
        ],
      },
      { t: "callout", tone: "warning", title: "These states are stored, not always derived", text: "Several statuses (inventory `status`, discount `status`, abandoned `stage`) are hand-editable fields in the mock and can be set inconsistently with their underlying numbers or dates. A real integration would compute them from source data via the Shopify Admin API and webhooks." },
    ],
  },
];
