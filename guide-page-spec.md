# In-app Guide / Wiki page — behavior spec

This describes **what the Guide page does and how its content is organized**, so you can build an
equivalent guide in another app. It is about *semantics and structure only* — not visual design.
Style it however fits your app.

---

## What it is

A single long-scroll handbook page with a table of contents down the side. Its defining idea:
**every topic is explained twice** — once for a non-technical operator using the product, once for
how it works technically. A tab switcher flips the whole page between those two versions.

---

## Core behaviors

### 1. Two audience tabs

- Two tabs at the top: **"For everyday use"** (non-technical) and **"Technical"**.
- Switching the tab re-renders every section in the chosen version. It does **not** navigate or
  scroll — the reader stays where they are and just sees the other explanation.
- Default tab is non-technical.
- The tab is deep-linkable via the URL (e.g. `?tab=technical`) so a link can open straight into the
  technical version.

### 2. Table of contents (side navigation)

- Lists every section, in page order.
- **Click an entry → smooth-scroll** to that section.
- **Scroll-spy**: as the reader scrolls, the TOC highlights whichever section is currently in view.
- Stays visible while scrolling (sticky). May be hidden on narrow screens.

### 3. Deep-linkable sections

- Every section has a stable slug used as both its anchor and its TOC target.
- Opening the page with a `#section-slug` in the URL scrolls to that section on load.
- Slugs are permanent once published — they are the shareable anchors. Combine with the tab param:
  `?tab=technical#some-section`.

### 4. Optional "deep dive" per section

- Below a section's main copy, a section may include **collapsible deep-dive blocks** the reader can
  expand on demand (history, edge cases, known issues, worked examples).
- These deep blocks show under **both** tabs, but their contents also adapt to the active tab
  (non-technical vs technical framing).
- Sections that don't need this simply omit it.

---

## Content structure

The whole page is driven by **one ordered list of sections**. Array order = page order = TOC order.
Each section has:

| Field | Meaning |
|---|---|
| `id` | Permanent slug — the DOM anchor and TOC target. |
| `title` | Shown in the TOC and as the section heading. |
| `nonTechnical` | The everyday-operator explanation (shown on the non-technical tab). |
| `technical` | The implementation explanation (shown on the technical tab). |
| `deep` *(optional)* | Collapsible deep-dive content, shown under both tabs, adapting to the tab. |

---

## Level of detail — how to write each version

**Non-technical version** — for the person using the product day to day:
- Plain language, no jargon.
- Task-focused: "here's what this area is for" and "here's how to do X".
- Numbered steps for procedures; field-by-field explanations for forms; a short highlighted
  callout for the one thing they must not miss.

**Technical version** — same topic, how it actually works:
- Implementation detail: data tables/columns, endpoints, file locations, algorithms, literal values.
- Explains *why* it's built that way where relevant.

**Deep-dive content** (optional, both tabs) — the encyclopedic layer the reader opts into:
- Before/after ("how this used to work vs now").
- Known issues, edge cases, race conditions, gotchas.
- Concrete worked examples / scenarios.
- Written at the same altitude as the active tab (simpler under non-technical, detailed under
  technical).

### Writing conventions
- Explain **every** topic in both versions — never leave one tab thinner than the other.
- Use consistent building blocks across sections: paragraphs, bullet lists, sub-headings, numbered
  step lists, term-and-definition lists, and short highlighted callouts.
- Bold the first mention of a key term; use inline code styling for identifiers, table/column names,
  endpoints, file paths, and literal values.
- Put procedures in numbered steps; put per-field/per-option reference in definition lists.
- Reserve one callout per section for the single most important point (a guarantee, a caveat, a
  warning).
- Keep history / edge cases / bugs in the collapsible deep-dive, not the main copy, so the main copy
  stays clean.

---

## Section ordering

- Lead with an **overview** section that explains what the whole platform is and lists the main areas.
- Then one section per feature/area, in a logical reading order.
- Consider ending with a **glossary**.

---

## Build checklist

- [ ] Two tabs (everyday / technical); switching re-renders in place without scrolling.
- [ ] Tab is settable from the URL.
- [ ] Side TOC listing all sections in order; click scrolls; scroll-spy highlights the current one.
- [ ] Each section has a permanent slug; `#slug` in the URL scrolls to it on load.
- [ ] Optional per-section collapsible deep-dive that adapts to the active tab.
- [ ] Content authored twice per topic (non-technical + technical), plus optional deep-dive.
- [ ] One ordered section list drives both the page and the TOC.
