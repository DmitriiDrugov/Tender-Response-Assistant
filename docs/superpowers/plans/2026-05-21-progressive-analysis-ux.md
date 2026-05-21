# Progressive Analysis UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty analysis screen during LLM pipeline execution with a full-page animated progress overlay that transitions into the analysis workspace when the first draft response is ready, and surface per-requirement draft status throughout.

**Architecture:** A `position: fixed` `AnalysisProgressScreen` overlay renders above the normal analysis workspace in `TenderDashboard`. It dismisses itself (fade + scale + blur) when `hasAnyDraft` flips true, which is derived reactively from `tender.requirements` polled every 2s. Per-requirement draft status is tracked via a new `draft_status` DB column written by the draft route.

**Tech Stack:** Next.js 15 App Router, React 18, Tailwind CSS v3, Supabase (Postgres), TypeScript strict, lucide-react

**Spec:** `docs/superpowers/specs/2026-05-21-progressive-analysis-ux-design.md`

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/0002_req_draft_status.sql` | New — adds `draft_status` column |
| `lib/types.ts` | Add `DraftStatus` type; add `draft_status` to `Requirement` |
| `app/api/tenders/[id]/draft/route.ts` | Set `draft_status` before/after each LLM call |
| `components/DraftStatusBadge.tsx` | New — pill badge per draft status |
| `components/AnalysisProgressScreen.tsx` | New — fixed overlay with optimistic progress bar |
| `components/DraftGenerationBanner.tsx` | New — top-of-tab live progress strip |
| `components/RequirementRow.tsx` | Add badge column; replace DraftEditor placeholder with status-based states |
| `components/tabs/AnalysisTab.tsx` | Mount DraftGenerationBanner; pass `draftingRunning` to rows |
| `components/TenderDashboard.tsx` | Add overlay state; render AnalysisProgressScreen |

---

## Task 1: DB Migration — add `draft_status` column

**Files:**
- Create: `supabase/migrations/0002_req_draft_status.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0002_req_draft_status.sql
alter table requirements
  add column draft_status text not null default 'pending'
    check (draft_status in ('pending', 'generating', 'ready', 'blocked', 'failed', 'skipped'));

-- Backfill existing rows that already have a draft_response
update requirements
  set draft_status = case
    when draft_response like '[REQUIRES BID MANAGER DECISION]%' then 'blocked'
    when draft_response is not null then 'ready'
    else 'pending'
  end
where draft_status = 'pending';
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the `mcp__supabase__apply_migration` tool with:
- `name`: `req_draft_status`
- `query`: the SQL above

- [ ] **Step 3: Verify the column exists**

Use `mcp__supabase__execute_sql` with:
```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'requirements' and column_name = 'draft_status';
```

Expected: one row with `column_name = 'draft_status'`, `data_type = 'text'`, `column_default = 'pending'`.

---

## Task 2: TypeScript types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add `DraftStatus` type and update `Requirement`**

In `lib/types.ts`, add after the `PipelineStatus` type (line 3) and update `Requirement`:

```ts
export type DraftStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'blocked'
  | 'failed'
  | 'skipped';
```

Then in the `Requirement` type, add `draft_status` after `draft_response`:

```ts
export type Requirement = {
  id: string;
  tender_id: string;
  ordinal: number;
  text: string;
  category: string | null;
  is_mandatory: boolean;
  source_excerpt: string | null;
  match_status: MatchStatus;
  matched_capability_ids: string[];
  gap_description: string | null;
  suggested_action: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  draft_response: string | null;
  draft_status: DraftStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  overridden_by_user: boolean;
  updated_at: string;
};
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors. (The draft route and RequirementRow will now have type errors that are fixed in subsequent tasks — that is acceptable here since we're making incremental changes.)

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts supabase/migrations/0002_req_draft_status.sql
git commit -m "add draft_status column and DraftStatus type"
```

---

## Task 3: Update draft route to write `draft_status`

**Files:**
- Modify: `app/api/tenders/[id]/draft/route.ts`

- [ ] **Step 1: Add `draft_status` to the requirements select query**

Find line 38 (the `.select(...)` call on requirements) and add `draft_status` to the field list:

```ts
const reqsRes = await sb
  .from('requirements')
  .select(
    'id, ordinal, text, category, is_mandatory, source_excerpt, match_status, matched_capability_ids, gap_description, suggested_action, confidence, draft_response, draft_status',
  )
  .eq('tender_id', id)
  .order('ordinal', { ascending: true });
```

- [ ] **Step 2: Set `draft_status = 'generating'` before each LLM call**

Immediately before the `try` block in the `for` loop (before line 111), add:

```ts
    await sb
      .from('requirements')
      .update({ draft_status: 'generating' })
      .eq('id', r.id);
```

- [ ] **Step 3: Set `draft_status = 'ready'` or `'blocked'` on success**

In the success block (the `.update(...)` after `enforceEvidenceBoundDraft`, around line 132–137), add `draft_status` to the update:

```ts
      await sb
        .from('requirements')
        .update({
          draft_response: guarded.draft_response,
          reviewer_notes: guarded.reviewer_notes,
          draft_status: guarded.requires_bid_manager_decision ? 'blocked' : 'ready',
        })
        .eq('id', r.id);
```

- [ ] **Step 4: Set `draft_status = 'failed'` on non-rate-limit error**

In the `catch` block, after setting `lastError`, add a `draft_status` update for the current requirement:

```ts
    } catch (err) {
      if (err instanceof RateLimitedError) {
        await sb
          .from('tenders')
          .update({
            drafting_status: 'failed',
            last_error:
              'Free-tier rate limit reached during drafting. Re-run drafting in a minute to resume.',
            drafting_progress_done: done,
          })
          .eq('id', id);
        return NextResponse.json({ error: err.message }, { status: 429 });
      }
      lastError =
        err instanceof LlmJSONParseError
          ? 'Model returned an unparseable response.'
          : (err as Error).message;
      await sb
        .from('requirements')
        .update({ draft_status: 'failed' })
        .eq('id', r.id);
    }
```

- [ ] **Step 5: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/tenders/[id]/draft/route.ts
git commit -m "write draft_status to requirements during drafting pipeline"
```

---

## Task 4: Create `DraftStatusBadge` component

**Files:**
- Create: `components/DraftStatusBadge.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { DraftStatus } from '@/lib/types';
import { InkStroke } from './InkStroke';

const BADGE: Record<DraftStatus, { dot: string; label: string; stroke?: true }> = {
  pending:   { dot: 'var(--border-strong)',   label: 'Queued' },
  generating:{ dot: 'var(--ink)',             label: 'Generating', stroke: true },
  ready:     { dot: 'var(--status-covered)',  label: 'Ready' },
  blocked:   { dot: 'var(--status-partial)',  label: 'Requires evidence' },
  failed:    { dot: 'var(--status-missing)',  label: 'Failed' },
  skipped:   { dot: 'var(--ink-faint)',       label: 'Skipped' },
};

export function DraftStatusBadge({ status }: { status: DraftStatus }) {
  const cfg = BADGE[status];
  return (
    <span className="hidden lg:inline-flex items-center gap-1.5 text-12 uppercase tracking-wider font-medium text-ink-muted whitespace-nowrap">
      <span className="dot flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
      {cfg.stroke ? <InkStroke className="ml-1" /> : null}
    </span>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/DraftStatusBadge.tsx
git commit -m "add DraftStatusBadge component"
```

---

## Task 5: Create `AnalysisProgressScreen` component

**Files:**
- Create: `components/AnalysisProgressScreen.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TenderFull } from '@/lib/types';
import { InkStroke } from './InkStroke';
import { cn } from '@/lib/utils';

type StepState = 'pending' | 'active' | 'complete';
type Step = { label: string; state: StepState };

function deriveSteps(tender: TenderFull, hasAnyDraft: boolean, opening: boolean): Step[] {
  const ext = tender.extraction_status;
  const mat = tender.matching_status;
  const dft = tender.drafting_status;
  return [
    { label: 'Document uploaded',       state: 'complete' },
    { label: 'Text extracted',          state: ext === 'complete' ? 'complete' : ext === 'running' ? 'active' : 'pending' },
    { label: 'Requirements extracted',  state: ext === 'complete' ? 'complete' : ext === 'running' ? 'active' : 'pending' },
    { label: 'Capabilities matched',    state: mat === 'complete' ? 'complete' : mat === 'running' ? 'active' : 'pending' },
    { label: 'Drafting first response', state: hasAnyDraft ? 'complete' : dft === 'running' ? 'active' : 'pending' },
    { label: 'Opening analysis',        state: opening ? 'active' : 'pending' },
  ];
}

const TAU = 15_000; // ms — exponential time constant; reaches ~85% at ~30s

export function AnalysisProgressScreen({
  tender,
  hasAnyDraft,
  onDismissed,
}: {
  tender: TenderFull;
  hasAnyDraft: boolean;
  onDismissed: () => void;
}) {
  const [progress, setProgress]   = useState(0);
  const [phase, setPhase]         = useState<'waiting' | 'ready' | 'dismissing'>('waiting');
  const startRef                  = useRef(Date.now());
  const rafRef                    = useRef<number | null>(null);
  const onDismissedRef            = useRef(onDismissed);
  onDismissedRef.current          = onDismissed;

  // Optimistic progress animation (0 → 85% with exponential deceleration)
  useEffect(() => {
    if (phase !== 'waiting') return;
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      setProgress(85 * (1 - Math.exp(-elapsed / TAU)));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  // When first draft arrives: snap to 100%, hold 600ms, then dismiss
  const handleReady = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPhase('ready');
    setProgress(100);
    const t = setTimeout(() => {
      setPhase('dismissing');
      setTimeout(() => onDismissedRef.current(), 400);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (hasAnyDraft && phase === 'waiting') handleReady();
  }, [hasAnyDraft, phase, handleReady]);

  const statusTitle = phase === 'ready'
    ? 'First response ready.'
    : 'Preparing tender analysis.';

  const steps = deriveSteps(tender, hasAnyDraft, phase === 'ready');

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Analysis pipeline progress"
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-paper',
        'transition-[opacity,transform,filter] duration-320 ease-out',
        phase === 'dismissing' && 'opacity-0 scale-[0.98] blur-[2px]',
      )}
    >
      <div className="w-full max-w-sm space-y-7 px-6">
        <div className="space-y-3">
          <h2 className="font-serif text-25 text-ink leading-tight max-w-reading">
            {tender.title}
          </h2>
          <p className="font-serif text-20 text-ink-2">{statusTitle}</p>
        </div>

        {/* Progress bar — exception to DESIGN.md "no progress bar" rule, scoped here only */}
        <div
          className="h-0.5 w-60 bg-border-strong overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-ink"
            style={{
              width: `${progress}%`,
              transition: phase === 'ready' ? 'width 500ms ease-out' : undefined,
            }}
          />
        </div>

        {/* Step timeline */}
        <ol className="space-y-2" aria-label="Pipeline steps">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-3 text-14 text-ink-muted">
              <span
                className="dot flex-shrink-0"
                style={{
                  background:
                    step.state === 'complete' ? 'var(--status-covered)'
                    : step.state === 'active'  ? 'var(--ink)'
                    : 'var(--border-strong)',
                }}
              />
              <span className={step.state !== 'pending' ? 'text-ink-2' : undefined}>
                {step.label}
              </span>
              {step.state === 'active' ? <InkStroke className="ml-1" /> : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/AnalysisProgressScreen.tsx
git commit -m "add AnalysisProgressScreen overlay component"
```

---

## Task 6: Create `DraftGenerationBanner` component

**Files:**
- Create: `components/DraftGenerationBanner.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { TenderFull } from '@/lib/types';
import { cn } from '@/lib/utils';

export function DraftGenerationBanner({
  tender,
  onDone,
}: {
  tender: TenderFull;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<'running' | 'completing' | 'collapsing'>('running');
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (tender.drafting_status !== 'complete' || phase !== 'running') return;
    setPhase('completing');
    const t1 = setTimeout(() => setPhase('collapsing'), 3_000);
    const t2 = setTimeout(() => onDoneRef.current(), 3_000 + 320);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [tender.drafting_status, phase]);

  const total = tender.drafting_progress_total;
  const done  = tender.drafting_progress_done;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const currentReq  = tender.requirements.find((r) => r.draft_status === 'generating');
  const currentText = currentReq
    ? currentReq.text.length > 60
      ? `${currentReq.text.slice(0, 60)}…`
      : currentReq.text
    : null;

  const barPct = phase === 'completing' || phase === 'collapsing' ? 100 : pct;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'border-b border-border bg-surface-2 overflow-hidden',
        'transition-[max-height] duration-320 ease-out',
        phase === 'collapsing' ? 'max-h-0' : 'max-h-24',
      )}
    >
      {/* 2px progress bar at top — exception to DESIGN.md "no progress bar" rule */}
      <div className="h-0.5 bg-border-strong">
        <div
          className="h-full bg-ink"
          style={{
            width: `${barPct}%`,
            transition: phase === 'completing'
              ? 'width 300ms ease-out'
              : 'width 1s linear',
          }}
        />
      </div>

      {phase === 'completing' || phase === 'collapsing' ? (
        <div className="flex items-center gap-3 py-3 px-5">
          <span className="dot flex-shrink-0" style={{ background: 'var(--status-covered)' }} />
          <span className="text-14 text-ink-2">
            Analysis complete · All {done} responses processed
          </span>
        </div>
      ) : (
        <div className="flex items-baseline justify-between py-3 px-5">
          <div className="space-y-0.5">
            <p className="text-14 text-ink-2">
              Drafting responses · {done} / {total}
            </p>
            {currentText ? (
              <p className="text-12 text-ink-muted">Currently drafting: {currentText}</p>
            ) : null}
          </div>
          <span className="shrink-0 pl-5 text-12 text-ink-muted tabular">
            {pct}% complete
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/DraftGenerationBanner.tsx
git commit -m "add DraftGenerationBanner component"
```

---

## Task 7: Update `RequirementRow` — `DraftEditor` status states

**Files:**
- Modify: `components/RequirementRow.tsx`

This task updates the `DraftEditor` function to render proper per-status states instead of the single placeholder.

- [ ] **Step 1: Add `RefreshCcw` import if not present and add `InkStroke` import**

At the top of `RequirementRow.tsx`, ensure both are imported:

```tsx
import { Check, ChevronDown, RefreshCcw } from 'lucide-react';
import { InkStroke } from './InkStroke';
```

- [ ] **Step 2: Replace the `DraftEditor` function**

The existing `DraftEditor` function spans lines 165–298. Replace it entirely with the following:

```tsx
function DraftEditor({
  requirement,
  onUpdated,
}: {
  requirement: Requirement;
  onUpdated: (r: Requirement) => void;
}) {
  const status = requirement.draft_status;

  // Non-editable states — no textarea
  if (status === 'pending') {
    return (
      <section className="space-y-2">
        <div className="label">Draft response</div>
        <p className="text-14 text-ink-muted">Draft response not generated yet.</p>
      </section>
    );
  }

  if (status === 'generating') {
    return (
      <section className="space-y-2">
        <div className="label">Draft response</div>
        <div className="flex items-center gap-3 text-14 text-ink-muted">
          <span>Generating draft response.</span>
          <InkStroke />
        </div>
      </section>
    );
  }

  if (status === 'skipped') {
    return (
      <section className="space-y-2">
        <div className="label">Draft response</div>
        <p className="text-14 text-ink-muted">This requirement was skipped during drafting.</p>
      </section>
    );
  }

  // Editable/actionable states — blocked, failed, ready
  return <DraftEditorEditable requirement={requirement} onUpdated={onUpdated} />;
}

function DraftEditorEditable({
  requirement,
  onUpdated,
}: {
  requirement: Requirement;
  onUpdated: (r: Requirement) => void;
}) {
  const r = requirement;
  const [value, setValue] = useState(r.draft_response ?? '');
  const [savedAt, setSavedAt] = useState<Date | null>(
    r.updated_at ? new Date(r.updated_at) : null,
  );
  const [saving, setSaving]         = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const timer                       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef                 = useRef(value);
  const labelId                     = useId();

  useEffect(() => {
    setValue(r.draft_response ?? '');
    lastSentRef.current = r.draft_response ?? '';
  }, [r.id, r.draft_response]);

  useEffect(() => {
    if (value === lastSentRef.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/requirements/${r.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft_response: value }),
        });
        if (!res.ok) {
          const d = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(d?.error || 'Save failed.');
          return;
        }
        const updated = (await res.json()) as Requirement;
        lastSentRef.current = updated.draft_response ?? '';
        setSavedAt(new Date());
        onUpdated(updated);
      } catch {
        setError('Network error. Will retry on next change.');
      } finally {
        setSaving(false);
      }
    }, AUTOSAVE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, r.id, onUpdated]);

  const onRegenerate = useCallback(async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/requirements/${r.id}/regenerate`, { method: 'POST' });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(d?.error || 'Regenerate failed.');
        return;
      }
      const updated = (await res.json()) as Requirement;
      onUpdated(updated);
      setValue(updated.draft_response ?? '');
      lastSentRef.current = updated.draft_response ?? '';
      setSavedAt(new Date());
    } catch {
      setError('Network error during regenerate.');
    } finally {
      setRegenerating(false);
    }
  }, [r.id, onUpdated]);

  const isBlocked = r.draft_status === 'blocked';
  const isFailed  = r.draft_status === 'failed';

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label id={labelId} className="label">Draft response</label>
        {!isBlocked && !isFailed ? (
          <div className="text-12 text-ink-muted tabular">
            {saving
              ? 'Saving.'
              : savedAt
                ? `Saved ${formatRelativeTime(savedAt.toISOString()) || 'just now'}`
                : ''}
          </div>
        ) : null}
      </div>

      {isBlocked ? (
        <p className="text-14 text-ink-2">
          Draft response requires evidence. No supporting capability was found.
        </p>
      ) : isFailed ? (
        <p className="text-14 text-accent">Draft generation failed.</p>
      ) : (
        <textarea
          aria-labelledby={labelId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full min-h-[8rem] bg-surface border border-border-strong px-4 py-3 font-serif text-16 leading-relaxed text-ink focus:outline-none focus:border-ink"
        />
      )}

      {error ? (
        <p role="alert" className="text-12 text-accent">{error}</p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="btn btn-sm"
        >
          <RefreshCcw size={14} strokeWidth={1.5} aria-hidden="true" />
          {regenerating ? 'Regenerating.' : 'Regenerate'}
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

---

## Task 8: Update `RequirementRow` — add `DraftStatusBadge` column

**Files:**
- Modify: `components/RequirementRow.tsx`

- [ ] **Step 1: Import `DraftStatusBadge`**

Add to the imports at the top of `RequirementRow.tsx`:

```tsx
import { DraftStatusBadge } from './DraftStatusBadge';
```

- [ ] **Step 2: Add `draftingRunning` prop to `RequirementRow`**

Update the function signature and prop type:

```tsx
export function RequirementRow({
  requirement,
  capabilities,
  expanded,
  onToggle,
  onUpdated,
  draftingRunning,
}: {
  requirement: Requirement;
  capabilities: Capability[];
  expanded: boolean;
  onToggle: () => void;
  onUpdated: (r: Requirement) => void;
  draftingRunning: boolean;
}) {
```

- [ ] **Step 3: Update the collapsed row button**

Replace the existing button className and children. The grid gains a 7th `auto` column when `draftingRunning` is true, and a `DraftStatusBadge` is inserted before the chevron:

```tsx
  return (
    <li className="border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          'w-full text-left py-3 px-5 grid items-center gap-5',
          'hover:bg-surface-sunk transition-colors duration-160 ease-out',
          draftingRunning
            ? '[grid-template-columns:auto_1fr_auto_auto_auto_auto_auto]'
            : '[grid-template-columns:auto_1fr_auto_auto_auto_auto]',
        )}
      >
        <StatusDot status={r.match_status} ring={r.overridden_by_user} />
        <span className="text-14 text-ink line-clamp-2">{r.text}</span>
        {r.category ? (
          <span className="hidden md:inline text-12 text-ink-muted uppercase tracking-wider whitespace-nowrap">
            {r.category}
          </span>
        ) : (
          <span />
        )}
        <MandatoryBadge mandatory={r.is_mandatory} />
        <ConfidenceBadge confidence={r.confidence} />
        {draftingRunning ? <DraftStatusBadge status={r.draft_status} /> : null}
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={cn(
            'text-ink-muted transition-transform duration-240 ease-out',
            expanded && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {expanded ? (
        <ExpandedPanel requirement={r} matched={matchedCaps} capabilities={capabilities} onUpdated={onUpdated} />
      ) : null}
    </li>
  );
```

- [ ] **Step 4: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: type error in `AnalysisTab` because `RequirementRow` now requires `draftingRunning` — this is fixed in Task 9. The component itself should have no errors.

- [ ] **Step 5: Commit tasks 7 and 8 together**

```bash
git add components/RequirementRow.tsx components/DraftStatusBadge.tsx
git commit -m "add per-requirement draft status states and badge column to RequirementRow"
```

---

## Task 9: Update `AnalysisTab` — mount banner and pass `draftingRunning`

**Files:**
- Modify: `components/tabs/AnalysisTab.tsx`

- [ ] **Step 1: Update imports**

Replace the existing `react` import and add `DraftGenerationBanner`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { DraftGenerationBanner } from '../DraftGenerationBanner';
```

- [ ] **Step 2: Add `showBanner` state inside `AnalysisTab`**

At the top of the `AnalysisTab` function body, after the existing state declarations:

```tsx
  const [showBanner, setShowBanner] = useState(tender.drafting_status === 'running');

  // Keep banner mounted if drafting starts after initial render
  useEffect(() => {
    if (tender.drafting_status === 'running') setShowBanner(true);
  }, [tender.drafting_status]);
```

- [ ] **Step 3: Compute `draftingRunning` and update the return**

```tsx
  const draftingRunning = tender.drafting_status === 'running';

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_22rem] items-start">
      <section className="space-y-5 min-w-0">
        {showBanner ? (
          <DraftGenerationBanner
            tender={tender}
            onDone={() => setShowBanner(false)}
          />
        ) : null}
        <CoverageStats counts={counts} />
        <FilterStrip
          filter={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          counts={counts}
        />

        {filtered.length === 0 ? (
          <p className="text-14 text-ink-muted py-7">
            {tender.requirements.length === 0
              ? 'No requirements extracted yet.'
              : 'No requirements match this filter.'}
          </p>
        ) : (
          <ul className="border-t border-border">
            {filtered.map((r) => (
              <RequirementRow
                key={r.id}
                requirement={r}
                capabilities={capabilities}
                expanded={expanded.has(r.id)}
                onToggle={() => toggleExpanded(r.id)}
                onUpdated={updateRequirement}
                draftingRunning={draftingRunning}
              />
            ))}
          </ul>
        )}
      </section>

      <SidePanel tender={tender} onRefresh={onRefresh} />
    </div>
  );
```

- [ ] **Step 4: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/tabs/AnalysisTab.tsx
git commit -m "mount DraftGenerationBanner and pass draftingRunning to RequirementRow"
```

---

## Task 10: Update `TenderDashboard` — mount `AnalysisProgressScreen` overlay

**Files:**
- Modify: `components/TenderDashboard.tsx`

- [ ] **Step 1: Import `AnalysisProgressScreen`**

Add to imports at the top of `TenderDashboard.tsx`:

```tsx
import { AnalysisProgressScreen } from './AnalysisProgressScreen';
```

- [ ] **Step 2: Add overlay state**

Inside the `TenderDashboard` function, after the existing state declarations, add:

```tsx
  const hasAnyDraft = tender.requirements.some(
    (r) => r.draft_status === 'ready' || r.draft_status === 'blocked',
  );

  const [showOverlay, setShowOverlay] = useState(
    () => !initial.requirements.some(
      (r) => r.draft_status === 'ready' || r.draft_status === 'blocked',
    ),
  );
```

- [ ] **Step 3: Render the overlay**

Update the return to render `AnalysisProgressScreen` when `showOverlay` is true:

```tsx
  return (
    <div className="px-7 lg:px-9 py-6">
      {showOverlay ? (
        <AnalysisProgressScreen
          tender={tender}
          hasAnyDraft={hasAnyDraft}
          onDismissed={() => setShowOverlay(false)}
        />
      ) : null}
      <div className="space-y-6">
        <TenderHeader tender={tender} />
        <Tabs
          tabs={[
            { key: 'analysis', label: 'Analysis' },
            { key: 'capabilities', label: 'Capabilities' },
            { key: 'export', label: 'Export' },
          ]}
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
        />

        {tab === 'analysis' ? (
          <AnalysisTab
            tender={tender}
            capabilities={capabilities}
            onTenderChange={setTender}
            onRefresh={refreshTender}
          />
        ) : null}

        {tab === 'capabilities' ? (
          <CapabilitiesTab
            tenderId={tender.id}
            capabilities={capabilities}
            onCapabilitiesChange={setCapabilities}
            onRefreshCapabilities={refreshCapabilities}
            onRefreshTender={refreshTender}
          />
        ) : null}

        {tab === 'export' ? <ExportTab tender={tender} /> : null}
      </div>
    </div>
  );
```

- [ ] **Step 4: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/TenderDashboard.tsx components/AnalysisProgressScreen.tsx
git commit -m "mount AnalysisProgressScreen overlay in TenderDashboard"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full typecheck**

```bash
npm run typecheck
```

Expected: exit 0, no errors.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build completes with no errors. Ignore any "Dynamic server usage" warnings from existing routes — those are pre-existing.

- [ ] **Step 3: Manual smoke test**

Run `npm run dev` and:

1. Upload a tender PDF. Confirm the `AnalysisProgressScreen` overlay appears (full viewport, tender title, timeline, animated progress bar).
2. While extraction runs, confirm the "Text extracted" and "Requirements extracted" step dots activate.
3. While matching runs, confirm "Capabilities matched" step activates.
4. While drafting runs, confirm "Drafting first response" step activates.
5. When the first requirement gets `draft_status = 'ready'` (after ~6s delay per requirement), confirm the progress bar snaps to 100%, "First response ready." text appears, then the overlay fades out after 600ms.
6. After overlay dismisses, confirm the analysis workspace is visible with the `DraftGenerationBanner` at the top of the Analysis tab.
7. In the banner, confirm "Drafting responses · N / M", "Currently drafting: [text]", and "X% complete" update live every 2s.
8. Expand a requirement that is still `pending` — confirm "Draft response not generated yet." appears, no textarea, no Regenerate button.
9. Expand a requirement that is `generating` — confirm "Generating draft response." with InkStroke.
10. Expand a requirement that is `ready` — confirm textarea with draft text, saved timestamp, Regenerate button.
11. Expand a requirement that is `blocked` — confirm "Draft response requires evidence." message, no textarea, Regenerate button visible.
12. When all drafts complete, confirm banner animates to 100%, shows "Analysis complete · All N responses processed", then collapses and disappears after 3s.

- [ ] **Step 4: Open a completed tender (no pipeline running)**

Navigate to a tender whose pipeline is already complete. Confirm:
- Overlay never appears (all requirements have `draft_status` = `ready` or `blocked`).
- Banner never appears (`drafting_status = 'complete'` from the start).
- `DraftStatusBadge` column does not appear in the requirements list.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "progressive analysis UX: overlay, banner, per-requirement draft states"
```
