# Tender Response Assistant — Design System

Editorial-typographic, document-grade, light theme. Every token below has a reason.

## Color (OKLCH, restrained strategy)

All neutrals are warm-tinted (hue ~70, a hair toward bone/parchment) so the screen reads like paper, not chrome. Chroma is intentionally low — high chroma at the extremes would garish the page.

```
--paper:        oklch(0.985 0.005 70)  /* canvas — page background */
--surface:      oklch(0.998 0.003 70)  /* card / row surface */
--surface-2:    oklch(0.955 0.008 70)  /* raised: source excerpt, code-like blocks */
--surface-sunk: oklch(0.965 0.006 70)  /* sunken: filter strip, side rail */

--border:       oklch(0.895 0.006 70)  /* hairline 1px */
--border-strong:oklch(0.825 0.008 70)  /* table dividers, section breaks */

--ink:          oklch(0.215 0.012 70)  /* primary text — warm near-black, not #000 */
--ink-2:        oklch(0.380 0.012 70)  /* secondary text */
--ink-muted:    oklch(0.520 0.010 70)  /* tertiary, metadata */
--ink-faint:    oklch(0.680 0.008 70)  /* disabled, placeholders */

/* The one accent. Used for action affordance, mandatory marker, critical risk.
   Deep oxblood, not red — a procurement seal color, not an alert color. */
--accent:       oklch(0.460 0.140 25)
--accent-ink:   oklch(0.355 0.155 25)  /* text on tinted accent bg */
--accent-tint:  oklch(0.955 0.020 25)  /* very faint background wash */

/* Status colors. Each is a single hue at a single chroma. No gradients. */
--status-covered:  oklch(0.480 0.075 155)  /* muted forest — fully_covered */
--status-partial:  oklch(0.620 0.110 75)   /* warm amber — partially_covered */
--status-missing:  oklch(0.460 0.140 25)   /* same as --accent — not_covered */
--status-unclear:  oklch(0.500 0.020 280)  /* desaturated lilac-grey — unclear */

/* Severity scale for risks — single hue family, varying L only. */
--severity-critical: oklch(0.380 0.170 25)
--severity-high:     oklch(0.480 0.150 35)
--severity-medium:   oklch(0.620 0.110 65)
--severity-low:      oklch(0.520 0.030 70)
```

Rules:
- Never `#000` or `#fff`. Use `--ink` and `--paper`.
- Status colors appear only as: a 6px round dot at the start of a requirement row, OR a 1-line text tint on a status label. Never as a full row background. Never as a side stripe.
- Accent is used for: the primary CTA, the mandatory marker, critical risk, hover state on links. Coverage usage stays well under 10% of pixel area.

## Typography

Two families, both via `next/font/google`. The serif carries hierarchy and the document feel; the sans carries dense chrome.

- **Serif (display, headings, document preview body):** Source Serif 4 (variable). Procurement-document register; a transitional serif with confident contrast.
- **Sans (UI body, chrome, dense lists):** Inter (variable). Default to feature settings `"ss01", "cv11"` for the straighter single-storey `a` and tabular figure alignment in numeric columns.
- **Mono (IDs, timestamps, source locations):** JetBrains Mono (variable).

### Scale

1.25 ratio. Used names, not raw px.

```
text-12  /* 0.75rem  */  metadata, labels small-caps
text-14  /* 0.875rem */  UI body default
text-16  /* 1rem     */  comfortable body / document
text-20  /* 1.25rem  */  H4 — requirement category headings
text-25  /* 1.5625rem */ H3 — section headings
text-31  /* 1.953rem */  H2 — tender title in dashboard
text-39  /* 2.441rem */  H1 — used sparingly, e.g. login or empty list state
```

Body line length capped at `max-w-[68ch]` for reading surfaces (excerpts, drafts, document preview). UI surfaces are not capped.

### Weights

- Serif: 400 (body), 500 (subhead), 600 (display). No 700 — avoids the "bold serif marketing" feel.
- Inter: 400 (body), 500 (UI label, button), 600 (strong UI emphasis only).
- Tabular numbers via `font-variant-numeric: tabular-nums` on every numeric column.

### Small caps for labels

Status pills and category tags use Inter at `text-12`, `tracking-[0.06em]`, `uppercase`, weight 500. This is the only place capitals appear. Mandatory markers are NOT shouted — they are a leading 6px dot in `--accent` plus a small "REQUIRED" label.

## Spacing

Varied scale, not 8px-everywhere monotony. Values in rem.

```
space-1   0.25     /* 4px  */
space-2   0.5      /* 8px  */
space-3   0.75     /* 12px */
space-4   1        /* 16px */
space-5   1.25     /* 20px */
space-6   1.75     /* 28px */
space-7   2.5      /* 40px */
space-8   3.5      /* 56px */
space-9   5        /* 80px */
```

Density guidance:
- Requirement row collapsed: `py-3 px-5` (12 / 20).
- Requirement row expanded inner padding: `p-6` plus `space-y-5` between sub-blocks. Generous after dense.
- Filter strip: `py-3 px-5`.
- Side rail: `p-6`.
- Page container: `px-7 lg:px-9 py-6`. NOT a centered max-w-4xl SaaS column. The dashboard uses the full screen width on desktop with a 1280px upper bound only for the document preview.

## Layout primitives

- **No nested cards.** A requirement is a row in a list, with a hairline divider above. Expansion happens in-place, not in a card-within-a-card.
- **Side panel collapses to a tab strip on the right edge.** Not a modal, not a drawer-overlay. It pushes content.
- **Tabs (Analysis / Capabilities / Export):** segmented horizontal control under the tender title. Underline on active, no pill background.

## Iconography

`lucide-react`, 16px in chrome, 20px in headings, 1.5px stroke (`strokeWidth={1.5}`). Icons are functional — file type on upload, chevron for expand, check for reviewed, alert-triangle for critical risk. No decorative icons. Never an icon-only button without an accessible name.

## Motion

- Default ease: `cubic-bezier(0.2, 0.8, 0.2, 1)` (close to ease-out-quart).
- Durations: 160ms for hover/focus rings; 240ms for row expansion (height transition via `grid-template-rows` 0fr→1fr trick to avoid animating CSS layout); 320ms for tab/panel changes.
- No bounce, no spring, no `transition-all`. Specify properties explicitly.
- Pipeline progress (Extracting → Matching → Drafting → Risks) uses a subtle ink-stroke "thinking" indicator on the active step — a 1px line that draws in over 1.6s and loops. Not a spinner.

## Components: specific decisions

### Requirement row (collapsed)
- Grid: `[status-dot 12px][text 1fr][category 120px][mandatory 80px][confidence 60px][chevron 20px]` with `gap-5`.
- Status dot: 6px filled circle in the relevant status color. Outline (1.5px stroke, no fill) if `overridden_by_user`.
- Text: Inter 14, color `--ink`. Truncate with two-line clamp at sm, single-line at lg+.
- Hover: row background shifts to `--surface-sunk`, no border change.
- Focus visible: 2px `--accent` ring inset, no offset.

### Requirement row (expanded)
- Background steps to `--surface-sunk`.
- Source excerpt block: serif at text-16, background `--surface-2`, left border NONE (banned), instead a hanging quote-mark glyph in `--ink-muted` at the top-left, leading-relaxed, max-w-[68ch].
- Matched capability chips: pill shape, `--accent-tint` background, `--accent-ink` text, no border, text-12 small caps.
- Gap description and suggested action: labeled paragraphs with serif small-caps label above (`text-12 tracking-wider uppercase ink-muted`), serif body below.
- Draft response: a contenteditable-style textarea — full width, monospace-free, serif body at text-16, no visible border until focus, autosave indicator (tiny ink-muted text "Saved 3s ago") below right.
- Action row at bottom: "Regenerate" (text button, accent on hover), "Mark reviewed" (toggle), "Override match" (select).

### Status pill
- `text-12 uppercase tracking-[0.06em] font-medium`, padding `px-2 py-0.5`, no background, status color text only, with a leading 6px dot of the same color. The dot does the heavy lifting; the label is the legend.

### Coverage bar (stat panel)
- A single 6px-tall horizontal bar, full width of its column, segmented inline (no gaps) into Covered / Partial / Missing / Unclear in their status colors. Hairline border around the full bar in `--border`. Below the bar: four small inline tallies, each prefixed by a 6px status dot — same dots used in the row list. The user's eye learns the dots once.

### Side panel tabs (Risks / Documents / Criteria)
- Vertical text tabs at the right edge when collapsed. When expanded, a 380px-wide panel with serif H3 section headings and dense lists. No card-per-item; just a hairline-divided list.

### Pipeline status (during processing)
- A single line of text under the tender title: "Extracting requirements." → "Matching against capabilities." → "Drafting 47 of 162 responses." → "Identifying risks." → "Ready."
- Beside the text, the ink-stroke indicator described in Motion. No progress bar. No percentages. The count "47 of 162" is the only number the user needs.

### Login
- Centered single field, serif headline "Tender Response Assistant" at text-31, sans subhead "Enter passcode to continue." Single passcode input, submit on Enter. No logo, no marketing strip, no "forgot passcode" link.

## DOCX export styling

The export uses the `docx` package and must look like a procurement document:

- A4, 25mm margins.
- Serif body (Cambria or Times New Roman as a fallback — DOCX font availability is the customer's machine, so name a common one): 11pt body, 1.15 leading.
- Section heading hierarchy: H1 (14pt bold, full caps, ruled-line under) for tender title; H2 (12pt bold) for "Section 1: Requirements"; H3 (11pt bold) per requirement category.
- Per requirement: requirement text in italics (the question), draft response below in roman. No status pills, no colors — black text only. A 0.5pt rule above each requirement.
- Footer: tender external ID, page X of Y, generation date.
- No "Generated by AI" footer. The bid manager owns this document.

## Accessibility hard rules

- All interactive elements reachable by keyboard in source order.
- Focus visible: 2px `--accent` ring on every focusable element. Never `outline: none` without a replacement.
- Color is never the sole channel — status uses dot + label, severity uses label + ordering.
- Form fields have `<label>`, not placeholders-as-labels.
- Live regions: pipeline status updates announce via `aria-live="polite"`.
- Minimum hit target 36px (relaxed from 44 because density is intentional, but never below 36).

## Anti-patterns (re-confirmed for this project)

- No gradients anywhere (background, text, borders).
- No glassmorphism.
- No "✨" or emoji in UI copy.
- No skeleton screens shaped like generic gray rounded blocks — instead, show the actual structure with placeholder serif text that fades in.
- No "Add to favorites," "Share," or social affordances — this is internal procurement work.
