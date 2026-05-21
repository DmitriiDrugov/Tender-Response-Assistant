# Progressive Analysis UX — Design Spec

**Date:** 2026-05-21
**Status:** Approved

## Problem

When a tender analysis starts, the current UI immediately renders the empty analysis workspace while the LLM pipeline runs in the background. Users see an empty requirements list, an empty draft textarea with a misleading placeholder ("Draft will appear here after the pipeline completes") alongside a "Saved 1 min ago" timestamp and a Regenerate button — all before any draft exists. There is no clear sense of progress or stage.

## Goal

Show a polished full-page progress screen from the moment analysis starts until the first usable draft response is available. Then transition smoothly into the analysis workspace. Continue surfacing live generation progress inside the workspace while remaining responses generate. Give each requirement a clear per-row draft status.

---

## Decisions

- **Per-requirement draft status:** Add `draft_status` column to the `requirements` table (Option A). Frontend-only inference was rejected because it cannot distinguish "generating" from "queued" or "failed."
- **Progress bar:** Exception to DESIGN.md's "no progress bar" rule, scoped to `AnalysisProgressScreen` and `DraftGenerationBanner` only. Not a new design system token.
- **Overlay architecture (Approach A):** `AnalysisProgressScreen` is a `position: fixed` overlay. The analysis workspace renders beneath it from the start. When the first draft arrives the overlay fades out, revealing the already-rendered workspace.
- **Completion animation:** Dot + text label only ("Analysis complete · All N responses processed"). No checkmark animation — tone is enterprise, not celebratory.

---

## Data Layer

### DB migration

```sql
alter table requirements
  add column draft_status text not null default 'pending'
    check (draft_status in ('pending','generating','ready','blocked','failed','skipped'));
```

### Draft route changes (`app/api/tenders/[id]/draft/route.ts`)

Before calling the LLM for each requirement:
```ts
await sb.from('requirements').update({ draft_status: 'generating' }).eq('id', req.id)
```

After the LLM call resolves:
- Success → `draft_status: 'ready'`
- Response starts with `[REQUIRES BID MANAGER DECISION]` → `draft_status: 'blocked'`
- LLM error / Zod parse failure → `draft_status: 'failed'`
- Intentionally excluded requirement → `draft_status: 'skipped'`

### TypeScript types (`lib/types.ts`)

```ts
export type DraftStatus = 'pending' | 'generating' | 'ready' | 'blocked' | 'failed' | 'skipped'

// Add to Requirement type:
draft_status: DraftStatus
```

### Polling — no changes

`TenderDashboard` already polls `/api/tenders/${id}` every 2s. That response includes `requirements[]`, each now carrying `draft_status`. No new endpoints needed.

### `hasAnyDraft` signal

```ts
const hasAnyDraft = tender.requirements.some(
  r => r.draft_status === 'ready' || r.draft_status === 'blocked'
)
```

---

## Components

### `AnalysisProgressScreen`

**File:** `components/AnalysisProgressScreen.tsx`

**Mount condition:** `TenderDashboard` initializes `showOverlay = !hasAnyDraft`. Once `hasAnyDraft` flips true, `showOverlay` enters a "dismissing" phase, then unmounts after 400ms. Never re-mounts.

**DOM:** `position: fixed, inset: 0, z-index: 50, background: --paper`. Single centered column, vertically centered.

**Dismissal animation:** `opacity: 0`, `scale(0.98)`, `blur(2px)`, duration 320ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`.

**Layout (top to bottom):**

1. Tender title — `font-serif text-25 text-ink max-w-reading`
2. Status title — `font-serif text-20 text-ink-2` — e.g. "Preparing tender analysis" or "Drafting first response"
3. Progress bar — `240px wide, 2px tall, --border-strong track, --ink fill`, width animated via `transition: width 500ms ease-out`
4. Step timeline — `text-13 text-ink-muted`, vertical list

**Step timeline:**

| Step | Complete condition |
|---|---|
| Document uploaded | always (user is on this page) |
| Text extracted | `extraction_status === 'complete'` |
| Requirements extracted | `extraction_status === 'complete'` |
| Capabilities matched | `matching_status === 'complete'` |
| Drafting first response | `hasAnyDraft === true` |
| Opening analysis | triggered on dismiss |

Each step: 6px dot in `--border` (pending), `--status-covered` (complete), `--ink` (active). Active step shows `InkStroke` inline. No checkmark icons.

**Optimistic progress:**

- `useEffect` runs a smooth 0% → 85% animation over ~30s using `requestAnimationFrame` with exponential deceleration.
- Capped at 85% until `hasAnyDraft` flips.
- On `hasAnyDraft`: animate to 100% over 500ms, hold 600ms ("First response ready." status title), then trigger dismissal.

---

### `DraftGenerationBanner`

**File:** `components/DraftGenerationBanner.tsx`

**Mount condition:** Rendered at the top of `AnalysisTab` when `tender.drafting_status === 'running'`.

**Layout:**

```
[2px progress bar — full width, top of strip, --ink fill]
[strip — --surface-2 bg, border-b border-border, py-3 px-5]
  Left:
    "Drafting responses · 10 / 41"    text-13 text-ink-2
    "Currently drafting: [req text]"  text-12 text-ink-muted  (omitted if none generating)
  Right:
    "24% complete"                    text-12 text-ink-muted tabular
```

Progress percentage: `drafting_progress_total > 0 ? Math.round((drafting_progress_done / drafting_progress_total) * 100) : 0`. The progress bar width follows this real value (not optimistic).

"Currently drafting" text: `tender.requirements.find(r => r.draft_status === 'generating')?.text`, truncated to `~60ch`. Omitted entirely if no requirement is currently generating.

**Completion sequence:**
1. `drafting_status` flips to `'complete'` → progress bar animates to 100% (300ms).
2. Strip content replaces with: 6px `--status-covered` dot + `"Analysis complete · All N responses processed"` in `text-13 text-ink-2`.
3. After 3s: strip collapses (`max-height: 0, overflow: hidden`, 320ms transition) and unmounts.

---

### `DraftStatusBadge`

**File:** `components/DraftStatusBadge.tsx`

Rendered as an extra column in `RequirementRow` only while `tender.drafting_status === 'running'`. Column is absent after drafting completes.

Style: `text-12 uppercase tracking-[0.06em] font-medium`, 6px dot + label, no background fill. Same pattern as existing status pills.

| `draft_status` | Dot color | Label |
|---|---|---|
| `pending` | `--border-strong` | `Queued` |
| `generating` | `--ink` (+ InkStroke) | `Generating` |
| `ready` | `--status-covered` | `Ready` |
| `blocked` | `--status-partial` | `Requires evidence` |
| `failed` | `--status-missing` | `Failed` |
| `skipped` | `--ink-faint` | `Skipped` |

---

### `DraftEditor` changes (`components/RequirementRow.tsx`)

Replace the single placeholder with conditional rendering on `draft_status`:

| `draft_status` | Render |
|---|---|
| `pending` | `<p>Draft response not generated yet.</p>` — no textarea |
| `generating` | `<p>Generating draft response.</p>` + InkStroke — no textarea |
| `ready` | Existing textarea + saved timestamp + Regenerate button |
| `blocked` | `<p>Draft response requires evidence. No supporting capability was found.</p>` + Regenerate button |
| `failed` | `<p class="text-accent">Draft generation failed.</p>` + Regenerate button |
| `skipped` | `<p>This requirement was skipped during drafting.</p>` |

The textarea is only rendered for `ready` status. All paragraph text: `text-14`, appropriate `text-ink-muted` / `text-ink-2` / `text-accent` per severity.

---

## Motion summary

| Transition | Duration | Easing |
|---|---|---|
| Overlay dismiss (opacity + scale + blur) | 320ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| Overlay unmount delay | 400ms | — |
| Progress bar (optimistic, 0→85%) | ~30s | exponential deceleration via rAF |
| Progress bar (100% snap on first draft) | 500ms | `ease-out` |
| Banner collapse on completion | 320ms | `ease-out` |
| Banner real progress bar | continuous | `transition: width 300ms ease-out` |

All motion follows DESIGN.md default ease. No bounce, no spring, no `transition-all`.

---

## Files changed

| File | Change |
|---|---|
| `supabase/migrations/<timestamp>_req_draft_status.sql` | New migration |
| `lib/types.ts` | Add `DraftStatus` type, add `draft_status` to `Requirement` |
| `app/api/tenders/[id]/draft/route.ts` | Set `draft_status` before/after each LLM call |
| `components/TenderDashboard.tsx` | Add `showOverlay` state, render `AnalysisProgressScreen` |
| `components/AnalysisProgressScreen.tsx` | New component |
| `components/DraftGenerationBanner.tsx` | New component |
| `components/DraftStatusBadge.tsx` | New component |
| `components/tabs/AnalysisTab.tsx` | Mount `DraftGenerationBanner`, pass `drafting_status` |
| `components/RequirementRow.tsx` | Replace `DraftEditor` placeholder with conditional states; add `DraftStatusBadge` column |

---

## Acceptance criteria

- Empty analysis UI is not shown before the first usable draft response.
- User sees clear animated progress (0→85% optimistic, then 100% on first draft) while waiting.
- Analysis workspace opens as soon as the first response is ready, with a smooth 320ms fade.
- Remaining responses continue appearing live via the 2s poll.
- Each requirement clearly shows its draft status (queued / generating / ready / blocked / failed / skipped) while drafting runs.
- Completion is communicated via the banner's collapse sequence — no decorative animation.
- `npm run typecheck` and `npm run build` pass after implementation.
