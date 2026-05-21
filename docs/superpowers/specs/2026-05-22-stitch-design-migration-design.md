# Stitch Design Migration

**Date:** 2026-05-22  
**Scope:** Full visual redesign — replace all current UI with Stitch "Tender Ledger" designs  
**Source:** `stitch-designs/` (10 HTML files + screenshots)

---

## 1. Design Tokens

### Color Palette
Replace current OKLCH CSS variables (paper/surface/ink/accent) with Material Design 3 tokens from Stitch. All token values added to `tailwind.config.ts` under `theme.extend.colors`:

| Token | Value | Usage |
|---|---|---|
| `primary` | `#705d00` | Primary accent, active states, CTAs |
| `primary-container` | `#ffd700` | Button fills, coverage bars |
| `primary-fixed` | `#ffe16d` | Avatar backgrounds, partial coverage |
| `primary-fixed-dim` | `#e9c400` | Dim state of primary-fixed |
| `on-primary` | `#ffffff` | Text on primary backgrounds |
| `on-primary-container` | `#705e00` | Text on primary-container |
| `on-primary-fixed` | `#221b00` | Text on primary-fixed |
| `background` | `#fbf9f8` | Page background |
| `surface` | `#fbf9f8` | Card/panel background |
| `surface-bright` | `#fbf9f8` | Elevated surfaces |
| `surface-dim` | `#dcd9d9` | Dimmed surface |
| `surface-variant` | `#e4e2e1` | Hover fills, nav active bg |
| `surface-container` | `#f0eded` | Table headers, footer |
| `surface-container-low` | `#f6f3f2` | Tender list rows |
| `surface-container-high` | `#eae8e7` | Sidebar background |
| `surface-container-highest` | `#e4e2e1` | Highest elevation |
| `surface-container-lowest` | `#ffffff` | Pure white panels |
| `on-surface` | `#1b1c1c` | Primary text |
| `on-surface-variant` | `#4d4732` | Secondary text, labels |
| `on-background` | `#1b1c1c` | Body text |
| `secondary` | `#5f5e5e` | Secondary actions |
| `secondary-container` | `#e4e2e1` | Progress bar tracks |
| `on-secondary` | `#ffffff` | Text on secondary |
| `tertiary` | `#5d5f5f` | Tertiary elements |
| `tertiary-container` | `#d9dada` | Tertiary fills |
| `outline` | `#7e775f` | Industrial borders |
| `outline-variant` | `#d0c6ab` | Dividers, subtle borders |
| `error` | `#ba1a1a` | Error states, critical |
| `error-container` | `#ffdad6` | Error background tint |
| `on-error` | `#ffffff` | Text on error |
| `on-error-container` | `#93000a` | Text on error-container |
| `inverse-surface` | `#303030` | Dark inversion |
| `inverse-on-surface` | `#f3f0f0` | Text on inverse surface |
| `inverse-primary` | `#e9c400` | Primary on dark |

### Typography Scale
Added to `tailwind.config.ts` under `theme.extend.fontFamily` and `theme.extend.fontSize`:

| Token | Font | Size | Weight | Line Height | Notes |
|---|---|---|---|---|---|
| `headline-lg` | Source Serif 4 | 32px | 700 | 1.2 | Page titles |
| `headline-md` | Source Serif 4 | 24px | 600 | 1.3 | Section titles, tender names |
| `headline-sm` | Source Serif 4 | 20px | 600 | 1.4 | Card titles |
| `body-lg` | Public Sans | 16px | 400 | 1.5 | Descriptions, prose |
| `body-md` | Public Sans | 14px | 400 | 1.5 | Primary body text |
| `label-md` | Public Sans | 12px | 700 | 1.0 | Uppercase labels, letter-spacing 0.05em |
| `label-mono` | JetBrains Mono | 11px | 500 | 1.0 | Code labels, letter-spacing 0.02em |
| `data-md` | JetBrains Mono | 13px | 500 | 1.4 | Numeric data, IDs |

### CSS Utility Classes
Added to `globals.css`:

```css
.industrial-border { border: 1px solid #7e775f; }
.heavy-border { border: 2px solid #1b1c1c; }
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  vertical-align: middle;
}
```

### Border Radius
`tailwind.config.ts` border radius: `DEFAULT: 0.25rem`, `lg: 0.5rem`, `xl: 0.75rem`, `full: 9999px`. All interactive elements use `rounded-none` to match the industrial aesthetic.

---

## 2. Layout Structure

### Fonts in `app/layout.tsx`
- Replace `Inter` with `Public_Sans` from `next/font/google`
- Add `<link>` for Material Symbols Outlined in `<head>`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
  ```

### Shell → Sidebar
`components/Shell.tsx` is renamed/replaced by `components/Sidebar.tsx`. New structure:

```
Fixed left sidebar (w-64, h-full, bg-surface-container-high, border-r border-outline/10):
  ┌ Header: "Tender Response" (headline-md, text-primary) + "Procurement Triage" (label-mono)
  ├ Nav (flex-1):
  │   ▪ Tenders    [description icon]   — active: border-r-2 border-primary, bg-surface-variant/30
  │   ▪ Capabilities [assignment_turned_in icon]
  │   ▪ Logs       [receipt_long icon]
  └ Footer:
      User avatar (initials square, bg-primary-fixed, text-on-primary-fixed)
      Name (label-md bold) + Role (label-mono)
      Logout [logout icon]
```

`SidebarLayout` wraps authenticated pages. Login page is standalone (no sidebar).

### Page Wrapper
All authenticated pages use:
```tsx
<div className="min-h-screen flex">
  <Sidebar />
  <div className="ml-64 flex-1 flex flex-col">
    {children}
  </div>
</div>
```

---

## 3. Login Page

**File:** `app/login/LoginForm.tsx`

Centered panel, max-width 440px, no sidebar.

- Body: background grid (`linear-gradient` 40px × 40px, ink/3% opacity)
- Panel: `bg-surface industrial-border p-10 relative overflow-hidden`
- Corner accents: 4 absolute `div` elements with 2px primary border in corners (8px × 8px)
- Header: `description` icon (40px, text-primary) + "Tender Response Assistant" (headline-md) + "SIGN IN TO CONTINUE" (label-mono uppercase)
- Email field: `industrial-border rounded-none bg-surface-container-lowest`, focus `ring-primary`
- Password field: same + "Forgot?" link (label-mono text-primary)
- Error state: hidden div with `bg-error-container`, `error_outline` icon, revealed on auth failure + shake animation
- Submit button: `bg-primary text-on-primary`, `label-mono uppercase tracking-widest`, `arrow_forward` icon, `active:scale-[0.98]`
- Footer: SECURITY POLICY + SYSTEM STATUS links (label-mono)
- Decorative text: fixed corners "Procurement Protocol v4.2.1" and "EST. 1994 DOCUMENT SYSTEMS" (label-mono, opacity 30%, hidden on mobile)

---

## 4. Tenders List

**Files:** `app/page.tsx`, `components/TenderListClient.tsx`, `components/UploadCard.tsx`

Layout: sidebar + `max-w-5xl mx-auto px-10 py-12`.

### Upload Zone (`UploadCard.tsx`)
- Dashed SVG border (`stroke-dasharray="8, 12"` rect, `#333`)
- `upload_file` icon (text-4xl, text-outline)
- "DRAG AND DROP A TENDER PDF OR CLICK TO BROWSE" (label-md)
- "UPLOAD PDF" button: `bg-primary-container text-on-primary-container heavy-border hover:shadow-[4px_4px_0px_0px_#333]`

### Past Tenders Section
- Section header: "PAST TENDERS" (label-md) + count badge `bg-on-surface text-surface`
- "Download History" link (label-mono underline)

### Tender Row
12-column grid per row, `brutal-border bg-surface-container-low p-6`:

| Col | Content |
|---|---|
| 1–5 | Tender name (headline-sm text-primary) + `arrow_outward` icon + authority (label-mono) + deadline + updated |
| 6–9 | "CAPABILITY COVERAGE" label + segmented bar (4 zones: primary/primary-fixed/surface-variant/error) + covered/missing counts |
| 10–12 | MATCH score (headline-md) + delete button |

Pipeline progress bar at row bottom when active.

### Stats Footer (3 cards)
`bg-surface-container`, `brutal-border` grid:
- Total Value Scanned
- Drafting Efficiency (hours saved)
- Matrix Health

---

## 5. Dashboard Shell

### `TenderHeader.tsx`
Sticky top bar (`z-40`, `bg-surface`, `border-b border-outline-variant/10`):

**Row 1:** `← Back to Tenders` button (label-md + `arrow_back` icon) + `/` divider + tender title (headline-md text-primary) | search input + `notifications` + `settings` icons

**Row 2 (metadata):** 4-cell grid `industrial-border divide-x`:
- Authority (label-md + data-md)
- Tender ID (label-md + data-md)
- Deadline (label-md + `text-error font-bold italic` if urgent)
- Estimated Value (label-md + data-md)

### `Tabs.tsx`
Horizontal nav below header:
- Active: `text-primary font-bold border-b-2 border-primary pb-2 font-body-md`
- Inactive: `text-on-surface-variant font-body-md pb-2 hover:text-primary`
- Badge: `bg-error text-on-error px-1.5 py-0.5 text-[10px]` (inline)
- Count: `text-on-surface-variant text-[10px]`

### `PipelineProgressBanner.tsx`
- `industrial-border bg-surface p-6`
- "RESPONSE PIPELINE" (label-md uppercase)
- 5-step stepper: Extracting → Matching → Drafting → Identifying Risks → Ready
- Active step: pulsing dot `animate-pulse bg-primary` + `text-primary font-extrabold underline`
- Completed: solid `bg-primary` dot
- Pending: `bg-surface-container ring-outline-variant` dot

### `RedFlagBanner.tsx`
- `heavy-border border-error bg-error-container/20 p-6`
- Left: `bg-error text-on-error p-2` square + `warning` icon + "SUBMISSION NOT READY" (headline-sm text-error uppercase) + bullet list of blockers
- Right: "View Blockers" button `bg-on-surface text-surface uppercase tracking-widest hover:bg-primary`

### Dashboard Footer (`TenderDashboard.tsx`)
```
[share Collaborate]  [history Revision History]  |  [Save Draft]  [Submit Package →]
```
Submit: `bg-primary text-on-primary shadow-[4px_4px_0px_0px_rgba(112,93,0,0.3)]`

---

## 6. Dashboard Tabs

### Overview (`tabs/OverviewTab.tsx`)
Two-column layout (8/4 at `lg`):

**Left (col-span-8):**
- Bid Recommendation card: `industrial-border` two-pane (text left, SVG donut chart right). Score badge `bg-primary-container text-on-primary-container`. Decision drivers with `check_circle`/`cancel` icons.
- Coverage tiles: 4-cell grid `industrial-border divide-x` — Fully Covered / Partially / Not Covered / Unclear
- Evaluation Matrix: `industrial-border` with dark header (`bg-on-surface text-surface`). Per-criterion: name + weight + progress bar (`bg-primary` on `bg-secondary-container`) + predicted score

**Right (col-span-4):**
- Submission Progress: 43% bar + "X of Y Items Completed" + checklist of categories with `data-md` values
- Critical Deadlines table: milestone + date + status badge (OVERDUE `bg-error`, active `text-primary`, upcoming neutral)

### Requirements (`tabs/AnalysisTab.tsx`)
- `FilterStrip` updated to use `industrial-border`, `label-md` buttons
- `RequirementRow` updated: status as colored dot + `label-md` status text, draft text in `prose-doc` style
- Match status colors: covered → `text-primary`, partial → `text-primary-fixed-dim`, missing → `text-error`, unclear → `text-outline`

### Documents (`tabs/DocumentsTab.tsx`)
- Document cards `industrial-border bg-surface-container-lowest`
- Status: `MISSING` → `text-error font-bold`, `REQUESTED` → `text-on-surface-variant`, `UPLOADED` → `text-primary`
- Upload action: `industrial-border` button + `upload_file` icon

### Risks (`tabs/RisksTab.tsx`)
- Critical/High: `heavy-border` card
- Medium/Low: `industrial-border` card
- Severity label: `label-md uppercase` with colors: critical `text-error`, high `text-on-primary-fixed-variant`, medium `text-outline`, low `text-on-surface-variant`
- Decision buttons: `industrial-border` accept/reject/flag actions

### Clarifications (`tabs/ClarificationsTab.tsx`)
- Question cards `industrial-border`
- Status pill: draft `bg-primary-container text-on-primary-container`, sent `bg-secondary-container`, answered `bg-surface-variant`
- Inline editing for question text

### Action Plan (`tabs/ActionPlanTab.tsx`)
- Grouped checklist: Missing Documents / Compliance Gaps / Risk Mitigations / Blocked Drafts
- Each item: `industrial-border p-4` + checkbox + description + severity indicator
- Section headers: `bg-on-surface text-surface` dark band

### Export (`tabs/ExportTab.tsx`)
- Export sections: Word / PDF / CSV
- Action buttons: `industrial-border` secondary + `bg-primary text-on-primary` primary CTA

### Capabilities (`components/CapabilitiesPageClient.tsx` + `CapabilityMatrix.tsx`)
- Full-page matrix with sidebar layout
- Add capability: dashed zone similar to upload card
- Matrix rows: `industrial-border`, category headers dark-banded
- Coverage indicator dots: primary/error/outline

---

## 7. Files Changed

| File | Change |
|---|---|
| `tailwind.config.ts` | Replace all tokens with Stitch palette + typography scale |
| `app/globals.css` | Replace CSS vars, add `.industrial-border`, `.heavy-border`, update base styles |
| `app/layout.tsx` | Replace Inter → Public Sans, add Material Symbols CDN link |
| `components/Shell.tsx` | Replace with `components/Sidebar.tsx` (sidebar layout) |
| `app/login/LoginForm.tsx` | Full redesign per section 3 |
| `app/page.tsx` | Update wrapper, add stats footer |
| `components/TenderListClient.tsx` | Redesign per section 4 |
| `components/UploadCard.tsx` | Dashed zone + brutal-border button |
| `components/TenderHeader.tsx` | Top bar with back nav + metadata grid |
| `components/Tabs.tsx` | New tab styles |
| `components/PipelineProgressBanner.tsx` | Token updates |
| `components/RedFlagBanner.tsx` | Token updates + heavy-border |
| `components/TenderDashboard.tsx` | Dashboard footer, layout wrapper |
| `components/tabs/OverviewTab.tsx` | Full redesign per section 6 |
| `components/tabs/AnalysisTab.tsx` | Token + row style updates |
| `components/tabs/DocumentsTab.tsx` | Token + card style updates |
| `components/tabs/RisksTab.tsx` | Token + severity style updates |
| `components/tabs/ClarificationsTab.tsx` | Token + card style updates |
| `components/tabs/ActionPlanTab.tsx` | Token + checklist style updates |
| `components/tabs/ExportTab.tsx` | Token + button style updates |
| `components/tabs/CapabilitiesTab.tsx` | Token updates |
| `components/CapabilitiesPageClient.tsx` | Layout + style updates |
| `components/CapabilityMatrix.tsx` | Token + industrial-border updates |
| `components/RequirementRow.tsx` | Token + status color updates |
| `components/FilterStrip.tsx` | Token + industrial-border updates |
| `components/StatusDot.tsx` | Update color mapping to new tokens |
| `components/DraftStatusBadge.tsx` | Token updates |
| `components/LogoutButton.tsx` | Style update to match sidebar logout link |

---

## 8. Border Naming Clarification

Stitch HTML uses two different border class names in different screens:
- `industrial-border` (dashboard screens): `1px solid #7e775f` (olive/outline tone)
- `brutal-border` (tenders list): `1px solid #333333` (near-black)

**Decision:** Use `industrial-border` everywhere with value `1px solid var(--outline)` (`#7e775f`). The darker #333333 variant used on tender rows will be rendered as `border border-outline` which resolves to the same outline color. Both map to `outline` token. This keeps one utility class throughout the codebase.

---

## 9. Constraints & Notes

- `tailwind.config.ts` requires user confirmation before modifying (CLAUDE.md rule)
- No `"use client"` added to server components
- No gradients anywhere
- No emoji in UI copy
- No `border-l-*` side stripes
- `rounded-none` used throughout for industrial aesthetic (override Tailwind defaults)
- Material Symbols rendered via `<span className="material-symbols-outlined">{iconName}</span>`
- All icon names from Stitch HTML `data-icon` attributes
- Dashed upload zone uses inline SVG background-image (no external asset needed)
- Login decorative text hidden on mobile (`hidden lg:block`)
