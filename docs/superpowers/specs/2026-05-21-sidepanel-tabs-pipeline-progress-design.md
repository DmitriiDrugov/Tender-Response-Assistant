# Design Spec: Workspace Tabs + Pipeline Progress

**Date:** 2026-05-21  
**Status:** Approved

---

## Problem Statement

1. **SidePanel overflow** — The sticky 22rem side panel (Risks + Required Documents + Evaluation Criteria) overflows the viewport with real data, requiring scroll and obscuring requirements.
2. **Silent pipeline** — After the AnalysisProgressScreen overlay dismisses (extraction complete), the matching → risks → drafting stages run silently. No visible indication that analysis is still in progress.

---

## Approach: Workspace Tabs + Pipeline Banner

### 1. Tab Structure Overhaul

**Before:** `Analysis | Capabilities | Export`  
**After:** `Overview | Requirements | Documents | Risks | Capabilities | Export`

#### Tab definitions

| Tab | Key | Content source | Notes |
|-----|-----|----------------|-------|
| Overview | `overview` | New | Coverage stats, evaluation criteria, doc/risk summary cards |
| Requirements | `requirements` | Current AnalysisTab | Rename only; same content |
| Documents | `documents` | SidePanel DocumentsSection | Full-width, expanded |
| Risks | `risks` | SidePanel RisksSection | Full-width, expanded |
| Capabilities | `capabilities` | Unchanged | — |
| Export | `export` | Unchanged | — |

#### Tab badges

- **Documents tab**: shows count of `missing` documents if > 0. Badge style: `text-12 font-mono tabular text-accent` in a small inline span next to label.
- **Risks tab**: shows count of `critical + high` risks if > 0. Same badge style.

#### SidePanel removal

`SidePanel` component is deleted. `AnalysisTab` grid (`lg:grid-cols-[1fr_22rem]`) becomes a single-column flex column. The `SidePanel` import and usage are removed from `AnalysisTab`.

#### Overview tab content

Sections in order:
1. **Coverage stats** — current `CoverageStats` component (moved here from Requirements tab, or duplicated as a summary).
2. **Submission readiness summary** — two stat groups (static for now, computed from tender data):
   - Documents: `N/M prepared or uploaded`
   - Risks: `N high/critical open`
3. **Evaluation criteria** — compact list moved from SidePanel `CriteriaSection`. Weight bars, same visual as current.

`CoverageStats` stays in Requirements tab too (contextual there), so it appears in both Overview and Requirements.

#### Documents tab (full-width)

Same functional behaviour as DocumentsSection in SidePanel: click-to-cycle status. But laid out as a wider table row:

```
[dot] Document name                      [status label] [required/optional badge]
```

- Divider rows, same `divide-y divide-border` pattern.
- `required` badge: `text-12 uppercase tracking-wider` with `--accent` dot.
- Error state stays inline (role="alert").
- Empty state: "No documents extracted." with `text-14 text-ink-muted`.

#### Risks tab (full-width)

Same data as RisksSection, wider layout. Each risk item:

```
[severity dot] SEVERITY  Category
Description text
Source location (mono)
Action (label + text)
```

Sorted critical → high → medium → low. Dividers between items. No cards, no stripes — consistent with design system.

---

### 2. Pipeline Progress

Two simultaneous indicators when any post-extraction stage is active (`matching_status`, `risks_status`, or `drafting_status` is `"running"` or downstream stages are `"pending"` while earlier stages are `"running"`).

#### PipelineProgressBanner

A persistent horizontal bar rendered **below the Tabs strip and above the tab content area** in `TenderDashboard`.

**Visibility:** renders when `pipelineSuffix(tender)` returns `true` (see logic below). Fades out on completion.

**Dimensions:** `py-3 px-7 lg:px-9` (matches page horizontal padding). Height ~44px.  
**Surface:** `bg-surface border-b border-border`.

**Content layout (flex row, items-center, gap-7):**

Left side — step list (flex row, gap-5):
```
[dot] Matching against capabilities. [InkStroke]   [dot] Identifying risks.   [dot] Drafting N of M.   [dot] Ready.
```

Step states:
- `complete`: dot `--status-covered`, label `text-12 text-ink-2`
- `active`: dot `--ink`, label `text-12 text-ink` + `<InkStroke className="ml-1" />`
- `pending`: dot `--border-strong`, label `text-12 text-ink-faint`

Right side (ml-auto): nothing initially; when all complete a brief "Ready." text fades in then the whole banner fades out after 1 200 ms.

**Step derivation logic** (pure function, mirrors `deriveSteps` in AnalysisProgressScreen):

```
matchingStep:  running/pending based on matching_status
risksStep:     running/pending based on risks_status
draftingStep:  active label includes "N of M" where N = count(draft_response != null), M = total requirements
readyStep:     complete when all three are 'complete'
```

Drafting step label: `Drafting ${drafted} of ${total} responses.` — matches CLAUDE.md copy spec.

**Transition:** banner mounts immediately when needed, fades out with `transition-opacity duration-320` after all steps reach complete + 1 200 ms delay.

#### TenderHeader pipeline status line

Below the existing header content (deadline, submission date, etc.), a single `text-12 text-ink-muted` line appears while the pipeline is active:

```
Matching against capabilities  [InkStroke]
```

The label updates as stages complete. Disappears (hidden, not removed) when `!pipelineSuffix(tender)`.

**Active stage text** (same precedence as banner):
- matching running → "Matching against capabilities."
- risks running → "Identifying risks."
- drafting running → "Drafting responses."
- all complete → line hidden

Use `<InkStroke />` inline after the text.

#### pipelineSuffix helper

```ts
function pipelineSuffix(t: TenderFull): boolean {
  return (
    t.matching_status === 'running' || t.matching_status === 'pending' ||
    t.risks_status === 'running'    || t.risks_status === 'pending'    ||
    t.drafting_status === 'running' || t.drafting_status === 'pending'
  );
}
```

Only evaluated after extraction is complete (overlay dismissed). The polling loop in `TenderDashboard` already covers this.

---

## Files Affected

| File | Change |
|------|--------|
| `components/TenderDashboard.tsx` | Add tab keys `overview`, `requirements`, `documents`, `risks`; render new tabs; add `PipelineProgressBanner` below Tabs |
| `components/tabs/AnalysisTab.tsx` | Remove SidePanel import/usage; remove grid, single-column layout; stays as RequirementsTab content |
| `components/tabs/OverviewTab.tsx` | New file: CoverageStats + submission readiness summary + CriteriaSection |
| `components/tabs/DocumentsTab.tsx` | New file: full-width DocumentsSection |
| `components/tabs/RisksTab.tsx` | New file: full-width RisksSection |
| `components/PipelineProgressBanner.tsx` | New file: banner component |
| `components/SidePanel.tsx` | Deleted |
| `components/TenderHeader.tsx` | Add pipeline status line |
| `components/Tabs.tsx` | Extend to support optional badge count on tab labels |

---

## Out of Scope

- Bid readiness / No-Bid recommendation (promt.md #2) — separate spec.
- Owner / Due Date / Status fields (promt.md #6) — separate spec.
- Full workspace features from promt.md Priority 1+ beyond tab structure.
- Multi-stage approval workflow (explicitly excluded in promt.md).

---

## Acceptance Criteria

- [ ] SidePanel component is gone; no 22rem side column in the Requirements view.
- [ ] Six tabs visible: Overview, Requirements, Documents, Risks, Capabilities, Export.
- [ ] Documents tab shows full-width list with click-to-cycle status, same behaviour as before.
- [ ] Risks tab shows full-width list, sorted critical → low.
- [ ] Evaluation criteria appears in Overview tab.
- [ ] Coverage stats visible in both Overview and Requirements tabs.
- [ ] PipelineProgressBanner appears below tab strip when any post-extraction stage is running or pending.
- [ ] Banner shows InkStroke on the active step, green dot on complete steps, faint dot on pending.
- [ ] Drafting step label shows "Drafting N of M responses."
- [ ] Banner fades out ~1.2 s after all stages complete.
- [ ] TenderHeader shows active stage name + InkStroke while pipeline runs; hides when complete.
- [ ] No regressions: typecheck and lint pass.
