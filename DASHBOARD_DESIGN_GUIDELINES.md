# Dashboard Design Guidelines

A complete, reusable spec for the **Vance** dashboard aesthetic. Hand this file to
Claude in another repo to reproduce the exact same design language. **Everything here is
color-agnostic** — you swap the color values (the HSL tokens in the `:root` / `.dark`
blocks) and keep the structure, typography, spacing, shadows, radii, and component
patterns as-is.

> The design is built on **Tailwind CSS v3 + CSS variables + shadcn-style primitives**.
> Every color is an HSL tri: `--token: H S% L%`, consumed as `hsl(var(--token))`. This is
> what makes recoloring trivial — change the numbers, nothing else.

---

## 1. Stack & foundations

- **Tailwind CSS v3** (config-driven, `darkMode: ['class']`). All design tokens are
  wired into `tailwind.config.ts` `theme.extend`.
- **CSS custom properties** define every color, shadow, and the base radius, split into a
  light `:root` block and a `.dark` block.
- **shadcn-style primitives**: small, `forwardRef`, `cn()`-composable components
  (`Card`, `Button`, `Badge`, `Input`, etc.) built with `class-variance-authority` (cva)
  for variants.
- **Icons**: a single icon file re-exports icons under friendly names, so the whole icon
  set can be swapped in one place. Icons are stroke-style line icons (Heroicons /
  Lucide family). Standard sizes: `size-4` (16px) inline, `size-[18px]` in nav/headers.
- **Animation**: `framer-motion` for page/element entrances; `tailwindcss-animate` for
  accordion/fade/scale keyframes.
- **Data-fetch UX**: `swr`; loading states are a centered spinner + "Loading…" caption.

---

## 2. Color system (swap these — keep the structure)

Colors are HSL triples. The **light theme** lives in `:root`, the **dark theme** in
`.dark`. Below is the Vance palette; **replace the numbers with your own brand**, but keep
the *same set of token names and their roles* — the components depend on them.

### Token roles (do not rename)

| Token | Role |
|---|---|
| `--background` / `--foreground` | App canvas & default text |
| `--card` / `--card-foreground` | Card/surface & its text |
| `--popover` / `--popover-foreground` | Menus, dropdowns |
| `--primary` / `--primary-foreground` | Brand action color (buttons, active accents) |
| `--secondary` / `--secondary-foreground` | Muted neutral fill |
| `--muted` / `--muted-foreground` | Subtle fills & secondary/caption text |
| `--accent` / `--accent-foreground` | Tinted hover / icon-chip background |
| `--highlight` / `--highlight-foreground` | Secondary attention color (amber-style pop) |
| `--success` / `--warning` / `--destructive` (+ `-foreground`) | Semantic states |
| `--border` / `--input` / `--ring` | Hairlines, field borders, focus ring |
| `--chart-1 … --chart-5` | Categorical data-viz series |
| `--sidebar-*` | Sidebar has its own scoped palette (see §8) |

### Vance reference values (replace with your own)

```css
:root {
  --background: 20 9% 95%;
  --foreground: 218 16% 14%;
  --card: 0 0% 100%;
  --card-foreground: 218 16% 14%;
  --popover: 0 0% 100%;
  --popover-foreground: 218 16% 14%;
  --primary: 183 49% 25%;            /* teal */
  --primary-foreground: 40 30% 98%;
  --secondary: 20 10% 92%;
  --secondary-foreground: 218 16% 22%;
  --muted: 20 10% 93%;
  --muted-foreground: 218 8% 42%;
  --accent: 183 26% 92%;             /* tinted primary */
  --accent-foreground: 183 49% 22%;
  --highlight: 34 96% 50%;           /* amber */
  --highlight-foreground: 218 16% 14%;
  --success: 152 46% 36%;
  --success-foreground: 0 0% 100%;
  --warning: 34 96% 48%;
  --warning-foreground: 218 16% 14%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 98%;
  --border: 20 9% 88%;
  --input: 20 9% 86%;
  --ring: 183 49% 30%;
  --chart-1: 183 49% 30%;
  --chart-2: 34 96% 52%;
  --chart-3: 205 55% 42%;
  --chart-4: 152 42% 42%;
  --chart-5: 12 62% 55%;
  --radius: 0.625rem;
}

.dark {
  --background: 200 24% 8%;          /* brand-tinted charcoal, NOT neutral gray */
  --foreground: 40 20% 93%;
  --card: 200 19% 12%;
  --card-foreground: 40 20% 93%;
  --popover: 200 20% 12.5%;
  --popover-foreground: 40 20% 93%;
  --primary: 183 58% 46%;            /* brighter in dark */
  --primary-foreground: 195 45% 8%;
  --secondary: 200 14% 18%;
  --secondary-foreground: 40 16% 92%;
  --muted: 200 14% 16%;
  --muted-foreground: 200 11% 62%;
  --accent: 188 44% 20%;
  --accent-foreground: 183 60% 74%;
  --highlight: 34 100% 58%;
  --highlight-foreground: 200 34% 9%;
  --success: 152 48% 47%;
  --warning: 34 96% 57%;
  --destructive: 3 70% 53%;
  --border: 200 15% 20%;
  --input: 200 15% 22%;
  --ring: 183 64% 52%;
  --chart-1: 183 56% 52%;  --chart-2: 34 100% 60%;  --chart-3: 205 62% 58%;
  --chart-4: 152 48% 54%;  --chart-5: 12 70% 62%;
}
```

### Recoloring rules (keep these principles when you change colors)

1. **Two colors carry the brand**: a `--primary` (the main brand hue) and a `--highlight`
   (a contrasting secondary pop, e.g. amber against teal). Everything else is derived
   neutrals and semantic states.
2. **Dark mode is brand-tinted, not neutral.** Background/card use the brand hue at very
   low lightness (e.g. `200 24% 8%`), never a dead `0 0% x%` gray.
3. **`--primary` is brighter/more saturated in dark** than in light so it reads on dark
   surfaces.
4. **`--accent` is a low-saturation tint of `--primary`** — used for hover states and
   icon chips, never for large fills.
5. Keep semantic colors conventional: success = green, warning/highlight = amber, destructive = red.

---

## 3. Typography

Three font families, wired via CSS variables so they're swappable:

- **Headings** → `font-heading` = **DM Sans** (falls back to Geist Sans). Used for all
  `h1–h6`, card titles, metric numbers.
- **Body / UI** → `font-sans` = **Geist Sans**. Default on `<body>`.
- **Numerics** → `font-mono` = **Geist Mono** available; but numbers usually use the
  heading font with `.tabular-nums`.
- (Optional display) → `font-grotesk` = **Space Grotesk** for special wordmarks.

Global type rules:

```css
body {
  @apply bg-background text-foreground font-sans antialiased;
  font-feature-settings: 'cv11', 'ss01';
  text-rendering: optimizeLegibility;
}
h1,h2,h3,h4,h5,h6 { @apply font-heading; letter-spacing: -0.011em; }
.tabular-nums { font-variant-numeric: tabular-nums; }
```

**Type scale in use** (Tailwind classes):

| Element | Classes |
|---|---|
| Page title (H1) | `font-heading text-lg font-semibold tracking-tight md:text-xl` |
| Section header (H2) | `font-heading text-lg font-semibold tracking-tight` |
| Card title (H3) | `font-heading text-base font-semibold leading-tight tracking-tight` |
| Big metric number | `font-heading text-2xl font-semibold leading-none tabular-nums md:text-3xl` |
| Hero / banner number | `font-heading text-4xl font-semibold tabular-nums md:text-6xl` |
| Body text | `text-sm` (14px) is the workhorse size |
| Caption / secondary | `text-xs text-muted-foreground` |
| Micro-label (uppercase) | `text-[11px] font-semibold uppercase tracking-wider` |

**Rules of thumb**
- All numbers that update or align in columns get `tabular-nums`.
- Headings use `tracking-tight`; big numbers use `leading-none`.
- Secondary text is always `text-muted-foreground`, never a hardcoded gray.

---

## 4. Radius, borders, shadows

### Radius (driven by one variable)
```
--radius: 0.625rem;   /* 10px base */
```
Tailwind maps: `rounded-lg = var(--radius)`, `rounded-xl = radius+4px`,
`rounded-md = radius-2px`, `rounded-sm = radius-4px`. Cards use `rounded-xl`; buttons,
inputs, nav items, icon chips use `rounded-lg`; small controls use `rounded-md`; pills/
badges/progress bars use `rounded-full`.

### Borders
- Hairline borders everywhere via `border-border` (a low-contrast token). `* { @apply border-border }`
  sets the default border color globally.
- Field borders use `border-input`.
- Dashed borders (`border-dashed`) are reserved for **empty states**.

### Shadows — defined, near-black elevation (never a light halo)

Shadows are CSS variables using a near-black `--shadow-color` so they read as real depth,
not a gray glow. **Define the full shadow strings in CSS** (not in the Tailwind config —
build-time parsers mangle `var()`+alpha):

```css
:root {
  --shadow-color: 220 40% 3%;
  --shadow-xs: 0 1px 2px 0 hsl(var(--shadow-color) / 0.16);
  --shadow-sm: 0 1px 2px -1px hsl(var(--shadow-color) / 0.24), 0 2px 5px -1px hsl(var(--shadow-color) / 0.16);
  --shadow-card: 0 1px 3px 0 hsl(var(--shadow-color) / 0.20), 0 6px 16px -6px hsl(var(--shadow-color) / 0.24);
  --shadow-elevated: 0 6px 18px -6px hsl(var(--shadow-color) / 0.32), 0 14px 34px -10px hsl(var(--shadow-color) / 0.28);
  --shadow-popover: 0 16px 42px -10px hsl(var(--shadow-color) / 0.40), 0 8px 20px -6px hsl(var(--shadow-color) / 0.30);
}
.dark { --shadow-color: 200 65% 2%; }  /* pure-black so shadows show on dark surfaces */
```
Tailwind aliases: `shadow-xs`, `shadow-sm`, `shadow-card`, `shadow-elevated`, `shadow-popover`.

**Usage:** Cards rest at `shadow-card`; on hover they lift to `shadow-elevated`. Buttons
use `shadow-xs`/`shadow-sm`. Menus/dropdowns/modals use `shadow-popover`.

---

## 5. Layout & spacing

### Page skeleton
Every authenticated page follows this shape:

```
<div className="flex min-h-full flex-col">
  <PageHeader title=… description=… icon=…> {actions} </PageHeader>
  <PageBody width="wide"> … </PageBody>
</div>
```

- **PageHeader** — sticky, `h-16`, bottom hairline, translucent blurred background:
  `sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur
  supports-[backdrop-filter]:bg-background/65`. Inner row is
  `mx-auto max-w-[1600px] px-4 md:px-8`, title left, action buttons right.
- **PageBody** — centered content wrapper: `mx-auto w-full px-4 py-6 md:px-8` with a
  width cap: `wide → max-w-[1600px]`, `default → max-w-6xl`, `narrow → max-w-3xl`.
  Dashboards use `wide`.

### Vertical rhythm
- Sections within a page are separated by `space-y-10` (dashboard) or `space-y-6`
  (tighter pages).
- Inside a section: `space-y-4` between the section header and its grid.
- Cards in a grid: `gap-4`.

### The canonical metric grid
Top-of-dashboard KPI row is **always**:
```
<div className="grid grid-cols-2 gap-4 lg:grid-cols-4"> … 4 metric cards … </div>
```
Two columns on mobile, four on desktop. Secondary content grids use
`grid-cols-1 lg:grid-cols-2` or `lg:grid-cols-3`.

---

## 6. Core components

### Card (`rounded-xl border bg-card shadow-card`)
```
Card         → rounded-xl border border-border bg-card text-card-foreground shadow-card
CardHeader   → flex items-start justify-between gap-4 px-5 py-4 border-b border-border
               (accepts an `action` node rendered on the right)
CardTitle    → font-heading text-base font-semibold leading-tight tracking-tight
CardDescription → text-sm text-muted-foreground
CardContent  → px-5 py-4
CardFooter   → flex items-center gap-3 border-t border-border px-5 py-4
```
- Standard card padding is `px-5 py-4`.
- Card header is divided from the body by a hairline (`border-b`), and can host a right-
  aligned action (a `Button`, an icon chip, or a small caption).

### Metric / KPI card (the signature element)
A `Card` whose `CardContent` is `flex flex-col gap-3`:
1. **Top row**: `flex items-start justify-between` — a `text-sm text-muted-foreground`
   label on the left, and a **tinted icon chip** on the right.
2. **Icon chip**: `flex size-9 items-center justify-center rounded-lg` + a tone class,
   containing a `size-4` icon.
3. **Value block**: big number
   `font-heading text-2xl font-semibold leading-none tabular-nums md:text-3xl`, with an
   optional `mt-1.5 text-xs text-muted-foreground` sub-caption.

**Tone chips** map a semantic tone to a tinted background + matching text (tint = color at
low alpha, so it recolors automatically):
```js
const TONE_CHIP = {
  primary:     'bg-accent text-primary',
  info:        'bg-[hsl(var(--chart-3)/0.14)] text-[hsl(var(--chart-3))]',
  highlight:   'bg-highlight/15 text-highlight',
  success:     'bg-success/12 text-success',
  warning:     'bg-warning/15 text-warning',
  destructive: 'bg-destructive/12 text-destructive',
}
```

### Button (cva variants)
Base: `inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium
transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
Auto-sizes SVGs to `size-4`.

| Variant | Style |
|---|---|
| `default` | `bg-primary text-primary-foreground shadow-sm hover:bg-primary/90` |
| `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `outline` | `border border-input bg-card shadow-xs hover:bg-accent hover:text-accent-foreground` |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` |
| `highlight` | `bg-highlight text-highlight-foreground shadow-sm hover:bg-highlight/90` |
| `destructive` | `bg-destructive text-destructive-foreground shadow-sm` |
| `link` | `text-primary underline-offset-4 hover:underline` |

Sizes: `sm` (h-8), `default` (h-9), `lg` (h-10), `icon` (h-9 w-9), `icon-sm` (h-8 w-8).
Supports `asChild` to render a `Link` as a button.

### Badge (pill, cva variants)
`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium`,
SVGs forced to `size-3`. Variants are transparent-border tints:
`primary → bg-primary/10 text-primary`, `success → bg-success/12`, `warning → bg-warning/15`,
`destructive → bg-destructive/12`, `outline → border-border text-muted-foreground`,
`solid → bg-primary text-primary-foreground`. Each has a `dark:` tint bump.

### Empty state
Centered, **dashed** border, muted circular icon:
```
flex flex-col items-center justify-center rounded-xl border border-dashed border-border
bg-card/40 px-6 py-14 text-center
  → circular icon chip: mb-4 size-12 rounded-full bg-muted text-muted-foreground (size-6 icon)
  → title: font-heading text-base font-semibold
  → description: mt-1.5 max-w-sm text-sm text-muted-foreground
```

### Loading state
Centered column: `<Loader2 className="size-6 animate-spin text-muted-foreground" />` +
`text-sm text-muted-foreground` "Loading…".

---

## 7. Data visualization patterns

The dashboards **avoid heavy chart libraries** for most views — they use lightweight,
recolorable primitives:

### Horizontal bar / ranked list (the workhorse)
For "top N by metric" lists (fields, sources, status split, leaderboards):
```
<div className="space-y-3.5">
  <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLOR }} />
        <span className="truncate font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-muted-foreground">· {sub}</span>
      </span>
      <span className="shrink-0 tabular-nums text-muted-foreground">{value}</span>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full transition-all duration-700"
           style={{ width: `${pct}%`, backgroundColor: CHART_COLOR }} />
    </div>
  </div>
</div>
```
- Track is `bg-muted`, fill is a chart color, both `rounded-full`, `h-2` (or `h-2.5`).
- Fill animates on load with `transition-all duration-700`.
- Each row is prefixed by a small `size-2` color dot.

### Categorical color palette
Series colors come from `--chart-1 … --chart-5`, cycled by index:
```js
const FIELD_COLORS = ['hsl(var(--chart-1))','hsl(var(--chart-2))','hsl(var(--chart-3))',
                      'hsl(var(--chart-4))','hsl(var(--chart-5))']
color = FIELD_COLORS[i % FIELD_COLORS.length]
```
Entity-owned colors (e.g. a project's stored `color`) are used directly for that entity's
dot and bar so it's identifiable across views.

### Leaderboard row
A 12-col grid: rank number (`font-heading tabular-nums text-muted-foreground/60`, zero-padded
`01`), name + dot + sub-label, a bar, and a right-aligned value. Row hover:
`rounded-lg hover:bg-muted/60`.

### Hero/banner stat
An inverted card for a headline number: `border-transparent bg-primary text-primary-foreground
shadow-elevated`, with a huge `text-4xl md:text-6xl` tabular number on the right and a
label + sub-caption (`text-primary-foreground/70`) on the left.

### Progress bar
`Progress` primitive: `h-2 rounded-full bg-muted` track with a `bg-primary` fill.

---

## 8. Sidebar (scoped palette)

The sidebar has its **own color scope** (`--sidebar-*`) so it can be a saturated brand
panel independent of the neutral canvas. In Vance it's a teal-green panel with amber
active accents.

Sidebar tokens: `--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`
(active icon / accent), `--sidebar-primary-foreground`, `--sidebar-accent` (hover fill),
`--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`.

Behavior & structure:
- Fixed, full-height, `w-64` expanded / `w-[72px]` collapsed, `transition-all duration-300`.
  On mobile it slides in (`-translate-x-full` → `translate-x-0`) over a
  `bg-foreground/30 backdrop-blur` overlay.
- Three regions: **brand header** (`h-16`, matches PageHeader height, bottom border),
  scrollable **nav** (`flex-1`), pinned **footer** (exit/home, sign-out, theme toggle).
- Nav grouped under a micro-label: `text-[11px] font-semibold uppercase tracking-wider
  text-sidebar-foreground/60` ("Workspace").
- **Nav item**: `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium`.
  - Active: `bg-sidebar-accent text-sidebar-accent-foreground` **plus** a
    `absolute left-0 h-5 w-1 rounded-full bg-highlight` accent bar, and the icon turns
    `text-sidebar-primary`.
  - Idle: `text-sidebar-foreground hover:bg-sidebar-accent/60`.
  - Icons are `size-[18px]`.
- Collapsed state centers icons and shows labels via `title` tooltips.

---

## 9. Interaction & motion

- **Transitions**: default to `transition-colors` on interactive elements; cards use
  `transition-all` for the hover lift. Bars use `transition-all duration-700`.
- **Card hover**: `hover:border-primary/40 hover:shadow-elevated` (border tints toward
  brand, elevation increases).
- **List-row hover**: `rounded-lg hover:bg-muted/60`; often paired with a chevron that
  nudges right: `transition-transform group-hover:translate-x-0.5`.
- **Focus**: always visible — `focus-visible:ring-2 ring-ring ring-offset-2
  ring-offset-background`.
- **Entrance animations** (keyframes in Tailwind config):
  - `fade-in` — opacity 0→1 + `translateY(4px)→0`, `0.25s ease-out`.
  - `scale-in` — opacity 0→1 + `scale(0.97)→1`, `0.15s ease-out`.
  - `accordion-down/up` — `0.2s ease-out`.
- **Group hover naming**: use `group`/`group-hover:` (and named `group/card`) so hovering
  a row/card animates child elements (title color shift, chevron nudge).

---

## 10. Theming & dark mode

- Toggle strategy: **class-based** (`darkMode: ['class']`), `.dark` on `<html>`, managed
  by a theme provider (`next-themes` style) with `defaultTheme="light"`, `enableSystem`,
  `disableTransitionOnChange`.
- Because every color is a token, dark mode is **just the `.dark` variable block** — no
  per-component dark classes except a few badge tint bumps (`dark:bg-*/20`).
- Never hardcode hex colors in components. The only place raw colors appear is
  entity-owned data (a project's chosen `color`) and inline chart colors via
  `hsl(var(--chart-n))`.

---

## 11. Miscellaneous polish

- **Scrollbars** are thin and themed: `scrollbar-width: thin`, thumb =
  `bg-border` rounded, hover = `muted-foreground/0.5`; webkit thumb has a 2px transparent
  border with `background-clip: content-box` (a floating pill look).
- **Smooth scroll**: `html { scroll-behavior: smooth }`.
- **Prose/markdown** styling (for any rich-text areas) uses the same tokens: DM Sans
  headings, `hsl(var(--primary))` links with underline offset, mono `code` on
  `bg-muted` with a border, `border-l-3` blockquotes in `muted-foreground`.
- **Icon chips** are the recurring motif: a `size-9 rounded-lg` tinted square holding a
  `size-4` icon, used in metric cards and card-header actions.
- **Color dots** (`size-2`–`size-2.5 rounded-full`) prefix nearly every labeled data row.

---

## 12. Quick-start checklist for the new repo

1. Install: `tailwindcss@3`, `tailwindcss-animate`, `class-variance-authority`,
   `clsx` + `tailwind-merge` (for `cn()`), an icon set (Heroicons/Lucide), `swr`,
   `framer-motion`, and the three fonts (DM Sans, Geist Sans/Mono, optional Space Grotesk).
2. Copy the **CSS variable blocks** (§2, §4) into `globals.css` — then **swap the color
   numbers** for your brand, keeping every token name.
3. Copy the **`tailwind.config.ts` `theme.extend`** (colors→`hsl(var(--…))`, fontFamily,
   borderRadius, boxShadow→`var(--shadow-*)`, keyframes/animation). `darkMode: ['class']`.
4. Build the primitives: `cn()`, `Card`, `Button`, `Badge`, `Input`, `EmptyState`,
   `Progress` exactly as specced in §6.
5. Build the layout: sticky blurred `PageHeader`, capped `PageBody`, scoped `Sidebar` (§5, §8).
6. Compose dashboards from: the **4-up metric grid**, **metric cards with tinted icon
   chips**, **bordered cards with header actions**, and **animated horizontal-bar lists**
   for all "top N" data (§7).
7. Keep the rules: tokens not hex, `tabular-nums` on numbers, `font-heading` on titles,
   `text-muted-foreground` for secondary text, `shadow-card`→`shadow-elevated` on hover.
