# Workspace Tabs + Pipeline Progress Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overflowing SidePanel with a six-tab workspace layout (Overview / Requirements / Documents / Risks / Capabilities / Export) and add a step-dot pipeline progress banner below the tab strip.

**Architecture:** SidePanel is deleted; its three sections (Risks, Documents, Evaluation Criteria) move to dedicated full-width tabs plus the new Overview tab. The `counts` computation is lifted from `AnalysisTab` to `TenderDashboard` so both Overview and Requirements tabs share it. A new `PipelineProgressBanner` component renders below the Tabs strip showing matching → risks → drafting step states with InkStroke animation. The existing `PipelineProgress` component in `TenderHeader` already covers the header status line — it needs no changes. The existing `DraftGenerationBanner` stays inside the Requirements tab for detailed drafting progress.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind CSS with project tokens, lucide-react, `cn()` utility.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/Tabs.tsx` | Modify | Add `badge?: number` field — renders in `--accent` color for alert counts |
| `components/tabs/RisksTab.tsx` | Create | Full-width risks list, sorted by severity |
| `components/tabs/DocumentsTab.tsx` | Create | Full-width documents checklist, click-to-cycle status |
| `components/tabs/OverviewTab.tsx` | Create | Coverage stats + submission readiness summary + evaluation criteria |
| `components/PipelineProgressBanner.tsx` | Create | Step-dot banner showing post-extraction pipeline progress |
| `components/TenderDashboard.tsx` | Modify | Six-tab structure, lifted counts, PipelineProgressBanner |
| `components/tabs/AnalysisTab.tsx` | Modify | Remove SidePanel, remove counts memo, accept counts prop |
| `components/SidePanel.tsx` | Delete | Replaced by tabs |

---

## Task 1: Add `badge` support to Tabs

**Files:**
- Modify: `components/Tabs.tsx`

The `Tabs` component already has `count?: number` (renders in muted). Add `badge?: number` for alert counts that render in accent color. This is needed for Documents (missing count) and Risks (critical+high count) badges.

- [ ] **Step 1: Open `components/Tabs.tsx` and update the type + render**

Replace the full file content with:

```tsx
"use client";

import { useId } from "react";

export type TabSpec = { key: string; label: string; count?: number; badge?: number };

/**
 * Segmented horizontal tabs with an underline on active. Keyboard:
 * left/right arrows move focus, Home/End jump, Enter/Space activates.
 */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabSpec[];
  active: string;
  onChange: (key: string) => void;
}) {
  const groupId = useId();

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const idx = tabs.findIndex((t) => t.key === active);
    if (idx < 0) return;
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    const t = tabs[next];
    if (t) onChange(t.key);
  }

  return (
    <div
      role="tablist"
      aria-label="Tender views"
      onKeyDown={onKeyDown}
      className="border-b border-border flex items-end gap-7"
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            id={`${groupId}-tab-${t.key}`}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(t.key)}
            className={[
              "relative pb-3 -mb-px flex items-center gap-2 text-14 transition-colors duration-160 ease-out",
              isActive ? "text-ink" : "text-ink-muted hover:text-ink-2",
            ].join(" ")}
          >
            <span className={isActive ? "font-medium" : ""}>{t.label}</span>
            {t.badge != null && t.badge > 0 ? (
              <span className="text-12 tabular text-accent font-medium">{t.badge}</span>
            ) : t.count != null ? (
              <span className="text-12 tabular text-ink-muted">{t.count}</span>
            ) : null}
            {isActive ? (
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 -bottom-px h-[2px] bg-ink"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify types pass**

```bash
cd "d:\Projects\Tender Response Assistant" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors from `Tabs.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "d:\Projects\Tender Response Assistant" && git add components/Tabs.tsx && git commit -m "add badge prop to Tabs for accent-coloured alert counts"
```

---

## Task 2: Create RisksTab

**Files:**
- Create: `components/tabs/RisksTab.tsx`

Full-width replacement for `RisksSection` from SidePanel. Same sort order (critical → low), same visual language, wider layout.

- [ ] **Step 1: Create `components/tabs/RisksTab.tsx`**

```tsx
import type { Risk } from "@/lib/types";

function sevRank(s: Risk["severity"]): number {
  return s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;
}

function severityColor(s: Risk["severity"]): string {
  if (s === "critical") return "var(--severity-critical)";
  if (s === "high") return "var(--severity-high)";
  if (s === "medium") return "var(--severity-medium)";
  return "var(--severity-low)";
}

export function RisksTab({ risks }: { risks: Risk[] }) {
  const ordered = [...risks].sort((a, b) => sevRank(a.severity) - sevRank(b.severity));

  return (
    <section aria-label="Risks">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-25 text-ink leading-none">Risks</h2>
        <span className="text-12 text-ink-muted tabular">{risks.length} identified</span>
      </div>

      {risks.length === 0 ? (
        <p className="text-14 text-ink-muted py-7">No risks identified.</p>
      ) : (
        <ul className="border-t border-border divide-y divide-border">
          {ordered.map((r) => (
            <li key={r.id} className="py-4 space-y-2">
              <div className="flex items-center gap-2 text-12 uppercase tracking-wider">
                <span
                  className="dot"
                  style={{ background: severityColor(r.severity) }}
                  aria-hidden="true"
                />
                <span style={{ color: severityColor(r.severity) }} className="font-medium">
                  {r.severity}
                </span>
                <span className="text-ink-muted normal-case tracking-normal">{r.category}</span>
              </div>
              <p className="text-14 text-ink leading-snug">{r.description}</p>
              {r.source_location ? (
                <p className="text-12 text-ink-muted font-mono">{r.source_location}</p>
              ) : null}
              {r.recommended_action ? (
                <p className="text-13 text-ink-2">
                  <span className="label mr-1.5">Action</span>
                  {r.recommended_action}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd "d:\Projects\Tender Response Assistant" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "d:\Projects\Tender Response Assistant" && git add components/tabs/RisksTab.tsx && git commit -m "add RisksTab: full-width risks list replacing SidePanel section"
```

---

## Task 3: Create DocumentsTab

**Files:**
- Create: `components/tabs/DocumentsTab.tsx`

Full-width replacement for `DocumentsSection` from SidePanel. Preserves the click-to-cycle status interaction and the API call to `/api/required-documents/[id]`.

- [ ] **Step 1: Create `components/tabs/DocumentsTab.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { DocumentStatus, TenderFull } from "@/lib/types";

const DOC_STATUSES: DocumentStatus[] = ["missing", "uploaded", "needs_review", "approved"];

const STATUS_LABEL: Record<DocumentStatus, string> = {
  missing: "Missing",
  uploaded: "Uploaded",
  needs_review: "Needs review",
  approved: "Approved",
};

const STATUS_COLOR: Record<DocumentStatus, string> = {
  missing: "var(--status-missing)",
  uploaded: "var(--status-partial)",
  needs_review: "var(--status-unclear)",
  approved: "var(--status-covered)",
};

export function DocumentsTab({
  docs,
  onRefresh,
}: {
  docs: TenderFull["required_documents"];
  onRefresh: () => Promise<void>;
}) {
  const prepared = docs.filter(
    (d) => d.status === "uploaded" || d.status === "approved",
  ).length;
  const [error, setError] = useState<string | null>(null);

  async function handleStatusCycle(docId: string, status: DocumentStatus) {
    const next = DOC_STATUSES[(DOC_STATUSES.indexOf(status) + 1) % DOC_STATUSES.length];
    try {
      const res = await fetch(`/api/required-documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(d?.error ?? "Status update failed.");
        return;
      }
      setError(null);
      await onRefresh();
    } catch {
      setError("Network error.");
    }
  }

  return (
    <section aria-label="Required documents">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-25 text-ink leading-none">Required documents</h2>
        <span className="text-12 text-ink-muted tabular">
          {prepared}/{docs.length} prepared
        </span>
      </div>

      {docs.length === 0 ? (
        <p className="text-14 text-ink-muted py-7">No documents extracted.</p>
      ) : (
        <>
          {error ? (
            <p role="alert" className="text-13 text-accent mb-3">
              {error}
            </p>
          ) : null}
          <ul className="border-t border-border divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="py-3.5 flex items-center justify-between gap-5">
                <span className="text-14 text-ink leading-snug flex-1">{d.name}</span>
                <button
                  type="button"
                  onClick={() => void handleStatusCycle(d.id, d.status)}
                  className="flex-shrink-0 flex items-center gap-2 text-13 text-ink-muted hover:text-ink transition-colors duration-160"
                  title="Click to change status"
                >
                  <span
                    className="dot"
                    style={{ background: STATUS_COLOR[d.status] }}
                    aria-hidden="true"
                  />
                  {STATUS_LABEL[d.status]}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd "d:\Projects\Tender Response Assistant" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "d:\Projects\Tender Response Assistant" && git add components/tabs/DocumentsTab.tsx && git commit -m "add DocumentsTab: full-width documents checklist replacing SidePanel section"
```

---

## Task 4: Create OverviewTab

**Files:**
- Create: `components/tabs/OverviewTab.tsx`

Aggregates the three key summary views: coverage stats (using the existing `CoverageStats` component), a submission readiness stat grid, and the evaluation criteria list (moved from SidePanel).

The `Counts` type must match what `CoverageStats` expects (as currently defined in `components/CoverageStats.tsx`).

- [ ] **Step 1: Create `components/tabs/OverviewTab.tsx`**

```tsx
import type { TenderFull } from "@/lib/types";
import { CoverageStats } from "../CoverageStats";

type Counts = {
  total: number;
  covered: number;
  partial: number;
  missing: number;
  unclear: number;
  mandatory: number;
  reviewed: number;
  missing_mandatory: number;
};

export function OverviewTab({
  tender,
  counts,
}: {
  tender: TenderFull;
  counts: Counts;
}) {
  const missingDocs = tender.required_documents.filter((d) => d.status === "missing").length;
  const criticalHighRisks = tender.risks.filter(
    (r) => r.severity === "critical" || r.severity === "high",
  ).length;
  const docsReady = tender.required_documents.filter(
    (d) => d.status === "uploaded" || d.status === "approved",
  ).length;
  const totalWeight = tender.evaluation_criteria.reduce(
    (s, c) => s + (c.weight_percent ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <CoverageStats counts={counts} />

      <section aria-label="Submission readiness">
        <h3 className="font-serif text-20 text-ink mb-4 leading-none">Submission readiness</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ReadinessStat
            label="Documents prepared"
            value={`${docsReady}/${tender.required_documents.length}`}
            alert={missingDocs > 0}
          />
          <ReadinessStat
            label="High / critical risks"
            value={String(criticalHighRisks)}
            alert={criticalHighRisks > 0}
          />
          <ReadinessStat
            label="Requirements reviewed"
            value={`${counts.reviewed}/${counts.total}`}
          />
          <ReadinessStat
            label="Missing mandatory"
            value={String(counts.missing_mandatory)}
            alert={counts.missing_mandatory > 0}
          />
        </div>
      </section>

      {tender.evaluation_criteria.length > 0 ? (
        <section aria-label="Evaluation criteria">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-20 text-ink leading-none">Evaluation criteria</h3>
            {totalWeight > 0 ? (
              <span className="text-12 text-ink-muted tabular">{totalWeight}% weighted</span>
            ) : null}
          </div>
          <ul className="space-y-3 border-t border-border pt-4">
            {tender.evaluation_criteria.map((c) => (
              <li key={c.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-5">
                  <span className="text-14 text-ink leading-snug">{c.criterion}</span>
                  {c.weight_percent != null ? (
                    <span className="font-serif text-16 tabular text-ink flex-shrink-0">
                      {c.weight_percent}%
                    </span>
                  ) : null}
                </div>
                {c.weight_percent != null ? (
                  <div className="h-1 bg-surface-2 overflow-hidden">
                    <span
                      className="block h-full bg-ink-2"
                      style={{ width: `${Math.min(100, c.weight_percent)}%` }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ReadinessStat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="border border-border p-4 space-y-1.5">
      <p className="label">{label}</p>
      <p
        className={[
          "font-serif text-25 tabular leading-none",
          alert ? "text-accent" : "text-ink",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd "d:\Projects\Tender Response Assistant" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "d:\Projects\Tender Response Assistant" && git add components/tabs/OverviewTab.tsx && git commit -m "add OverviewTab: coverage stats, submission readiness, evaluation criteria"
```

---

## Task 5: Create PipelineProgressBanner

**Files:**
- Create: `components/PipelineProgressBanner.tsx`

A horizontal bar below the Tabs strip that shows three post-extraction pipeline steps (matching, risks, drafting) as dot + label + optional InkStroke. Only visible when `extraction_status === 'complete'` and at least one downstream stage is running or pending. Fades out 1 200 ms after all stages complete.

The `DraftGenerationBanner` inside the Requirements tab covers detailed drafting progress — this banner covers the high-level stage view across all tabs.

- [ ] **Step 1: Create `components/PipelineProgressBanner.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { TenderFull } from "@/lib/types";
import { InkStroke } from "./InkStroke";
import { cn } from "@/lib/utils";

type StepState = "complete" | "active" | "pending";
type Step = { label: string; state: StepState };

function derivePipelineSteps(tender: TenderFull): Step[] {
  const { matching_status, risks_status, drafting_status } = tender;
  const done = tender.drafting_progress_done;
  const total = tender.drafting_progress_total;

  const matchState: StepState =
    matching_status === "complete" ? "complete"
    : matching_status === "running" ? "active"
    : "pending";

  const risksState: StepState =
    risks_status === "complete" ? "complete"
    : risks_status === "running" ? "active"
    : "pending";

  const draftState: StepState =
    drafting_status === "complete" ? "complete"
    : drafting_status === "running" ? "active"
    : "pending";

  const draftLabel =
    draftState === "active" && total > 0
      ? `Drafting ${done} of ${total} responses.`
      : "Drafting responses.";

  const allDone =
    matching_status === "complete" &&
    risks_status === "complete" &&
    drafting_status === "complete";

  return [
    { label: "Matching against capabilities.", state: matchState },
    { label: "Identifying risks.", state: risksState },
    { label: draftLabel, state: draftState },
    { label: "Ready.", state: allDone ? "complete" : "pending" },
  ];
}

function hasPendingWork(tender: TenderFull): boolean {
  return (
    tender.matching_status === "running" ||
    tender.matching_status === "pending" ||
    tender.risks_status === "running" ||
    tender.risks_status === "pending" ||
    tender.drafting_status === "running" ||
    tender.drafting_status === "pending"
  );
}

export function PipelineProgressBanner({ tender }: { tender: TenderFull }) {
  const [visible, setVisible] = useState(hasPendingWork(tender));
  const [dismissing, setDismissing] = useState(false);

  const pending = hasPendingWork(tender);

  useEffect(() => {
    if (pending) {
      setVisible(true);
      setDismissing(false);
      return;
    }
    if (!visible) return;
    const t1 = setTimeout(() => setDismissing(true), 1_200);
    const t2 = setTimeout(() => setVisible(false), 1_200 + 320);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pending, visible]);

  if (!visible) return null;

  const steps = derivePipelineSteps(tender);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-b border-border bg-surface px-7 lg:px-9 py-3",
        "transition-opacity duration-320 ease-out",
        dismissing && "opacity-0",
      )}
    >
      <ol className="flex flex-wrap items-center gap-x-7 gap-y-1.5" aria-label="Analysis pipeline">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2 text-13">
            <span
              className="dot flex-shrink-0"
              style={{
                background:
                  step.state === "complete"
                    ? "var(--status-covered)"
                    : step.state === "active"
                      ? "var(--ink)"
                      : "var(--border-strong)",
              }}
              aria-hidden="true"
            />
            <span
              className={
                step.state === "active"
                  ? "text-ink"
                  : step.state === "complete"
                    ? "text-ink-2"
                    : "text-ink-faint"
              }
            >
              {step.label}
            </span>
            {step.state === "active" ? <InkStroke className="ml-1" /> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd "d:\Projects\Tender Response Assistant" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "d:\Projects\Tender Response Assistant" && git add components/PipelineProgressBanner.tsx && git commit -m "add PipelineProgressBanner: step-dot progress for post-extraction stages"
```

---

## Task 6: Refactor TenderDashboard — workspace tabs + banner

**Files:**
- Modify: `components/TenderDashboard.tsx`

Replace the three-tab layout with six tabs. Lift the `counts` computation (previously in `AnalysisTab`) to here so both Overview and Requirements tabs can use it. Render `PipelineProgressBanner` between the Tabs strip and tab content. Remove the `SidePanel` from any imports (it will no longer be used).

- [ ] **Step 1: Replace `components/TenderDashboard.tsx` with the new content**

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TenderFull, Capability } from "@/lib/types";
import { TenderHeader } from "./TenderHeader";
import { Tabs } from "./Tabs";
import { AnalysisTab } from "./tabs/AnalysisTab";
import { CapabilitiesTab } from "./tabs/CapabilitiesTab";
import { ExportTab } from "./tabs/ExportTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { RisksTab } from "./tabs/RisksTab";
import { AnalysisProgressScreen } from "./AnalysisProgressScreen";
import { PipelineProgressBanner } from "./PipelineProgressBanner";

type TabKey = "overview" | "requirements" | "documents" | "risks" | "capabilities" | "export";

async function advancePipeline(
  id: string,
  snapshot: TenderFull,
  refresh: () => Promise<void>,
) {
  try {
    if (snapshot.matching_status === "pending") {
      const res = await fetch(`/api/tenders/${id}/match`, { method: "POST" });
      await refresh();
      if (!res.ok) return;
    }
    if (snapshot.risks_status === "pending") {
      const res = await fetch(`/api/tenders/${id}/risks`, { method: "POST" });
      await refresh();
      if (!res.ok) return;
    }
    if (snapshot.drafting_status === "pending") {
      await fetch(`/api/tenders/${id}/draft`, { method: "POST" });
      await refresh();
    }
  } catch {
    // Errors are reflected in tender status; polling will surface them.
  }
}

function pipelineActive(t: TenderFull): boolean {
  return (
    t.extraction_status === "running" ||
    t.matching_status === "running" ||
    t.drafting_status === "running" ||
    t.risks_status === "running"
  );
}

function computeCounts(requirements: TenderFull["requirements"]) {
  const c = {
    total: 0,
    covered: 0,
    partial: 0,
    missing: 0,
    unclear: 0,
    mandatory: 0,
    reviewed: 0,
    missing_mandatory: 0,
  };
  for (const r of requirements) {
    c.total++;
    if (r.is_mandatory) c.mandatory++;
    if (r.reviewed_at) c.reviewed++;
    if (r.match_status === "fully_covered") c.covered++;
    else if (r.match_status === "partially_covered") c.partial++;
    else if (r.match_status === "not_covered") {
      c.missing++;
      if (r.is_mandatory) c.missing_mandatory++;
    } else if (r.match_status === "unclear") c.unclear++;
  }
  return c;
}

export function TenderDashboard({
  initial,
  initialCapabilities,
}: {
  initial: TenderFull;
  initialCapabilities: Capability[];
}) {
  const [tender, setTender] = useState<TenderFull>(initial);
  const [capabilities, setCapabilities] = useState<Capability[]>(initialCapabilities);
  const [tab, setTab] = useState<TabKey>("overview");
  const [showOverlay, setShowOverlay] = useState(initial.extraction_status !== "complete");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advancedRef = useRef(false);

  const counts = useMemo(() => computeCounts(tender.requirements), [tender.requirements]);

  const missingDocBadge = tender.required_documents.filter((d) => d.status === "missing").length;
  const highRiskBadge = tender.risks.filter(
    (r) => r.severity === "critical" || r.severity === "high",
  ).length;

  const refreshTender = useCallback(async () => {
    const res = await fetch(`/api/tenders/${tender.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as TenderFull;
    setTender(data);
  }, [tender.id]);

  const refreshCapabilities = useCallback(async () => {
    const res = await fetch(`/api/capabilities`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { capabilities: Capability[] };
    setCapabilities(data.capabilities);
  }, []);

  useEffect(() => {
    if (advancedRef.current) return;
    if (initial.extraction_status !== "complete") return;
    if (
      initial.matching_status !== "pending" &&
      initial.risks_status !== "pending" &&
      initial.drafting_status !== "pending"
    )
      return;
    advancedRef.current = true;
    void advancePipeline(initial.id, initial, refreshTender);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pipelineActive(tender)) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (showOverlay) setShowOverlay(false);
      return;
    }
    if (!pollRef.current) {
      pollRef.current = setInterval(() => {
        void refreshTender();
      }, 2000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [tender, refreshTender, showOverlay]);

  return (
    <>
      {showOverlay && (
        <AnalysisProgressScreen
          tender={tender}
          onDismissed={() => setShowOverlay(false)}
        />
      )}
      <div className="px-7 lg:px-9 py-6">
        <div className="space-y-6">
          <TenderHeader tender={tender} />
          <Tabs
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "requirements", label: "Requirements", count: counts.total },
              {
                key: "documents",
                label: "Documents",
                badge: missingDocBadge > 0 ? missingDocBadge : undefined,
                count: missingDocBadge === 0 ? tender.required_documents.length : undefined,
              },
              {
                key: "risks",
                label: "Risks",
                badge: highRiskBadge > 0 ? highRiskBadge : undefined,
                count: highRiskBadge === 0 ? tender.risks.length : undefined,
              },
              { key: "capabilities", label: "Capabilities" },
              { key: "export", label: "Export" },
            ]}
            active={tab}
            onChange={(k) => setTab(k as TabKey)}
          />

          {tender.extraction_status === "complete" && (
            <PipelineProgressBanner tender={tender} />
          )}

          {tab === "overview" ? (
            <OverviewTab tender={tender} counts={counts} />
          ) : null}

          {tab === "requirements" ? (
            <AnalysisTab
              tender={tender}
              capabilities={capabilities}
              counts={counts}
              onTenderChange={setTender}
            />
          ) : null}

          {tab === "documents" ? (
            <DocumentsTab docs={tender.required_documents} onRefresh={refreshTender} />
          ) : null}

          {tab === "risks" ? (
            <RisksTab risks={tender.risks} />
          ) : null}

          {tab === "capabilities" ? (
            <CapabilitiesTab
              tenderId={tender.id}
              capabilities={capabilities}
              onCapabilitiesChange={setCapabilities}
              onRefreshCapabilities={refreshCapabilities}
              onRefreshTender={refreshTender}
            />
          ) : null}

          {tab === "export" ? <ExportTab tender={tender} /> : null}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify typecheck — expect AnalysisTab prop error (counts not accepted yet)**

```bash
cd "d:\Projects\Tender Response Assistant" && npx tsc --noEmit 2>&1 | head -40
```

Expected: error on `counts` prop passed to `AnalysisTab` — will be fixed in Task 7. All other errors are unexpected.

- [ ] **Step 3: Commit (pre-Task-7 state — typecheck will pass after Task 7)**

```bash
cd "d:\Projects\Tender Response Assistant" && git add components/TenderDashboard.tsx && git commit -m "refactor TenderDashboard: workspace tabs, lift counts, add pipeline banner"
```

---

## Task 7: Update AnalysisTab — remove SidePanel, accept counts prop

**Files:**
- Modify: `components/tabs/AnalysisTab.tsx`

Remove the `SidePanel` import and usage. Remove the `counts` `useMemo` (now computed in TenderDashboard). Add `counts` to the component's props. The grid layout becomes a single column.

- [ ] **Step 1: Replace `components/tabs/AnalysisTab.tsx` with the updated content**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Capability, Requirement, TenderFull } from "@/lib/types";
import { CoverageStats } from "../CoverageStats";
import { DraftGenerationBanner } from "../DraftGenerationBanner";
import { FilterStrip, type FilterKey } from "../FilterStrip";
import { RequirementRow } from "../RequirementRow";

type Counts = {
  total: number;
  covered: number;
  partial: number;
  missing: number;
  unclear: number;
  mandatory: number;
  reviewed: number;
  missing_mandatory: number;
};

export function AnalysisTab({
  tender,
  capabilities,
  counts,
  onTenderChange,
}: {
  tender: TenderFull;
  capabilities: Capability[];
  counts: Counts;
  onTenderChange: (t: TenderFull) => void;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showBanner, setShowBanner] = useState(tender.drafting_status === "running");

  useEffect(() => {
    if (tender.drafting_status === "running") setShowBanner(true);
  }, [tender.drafting_status]);

  const draftingRunning = tender.drafting_status === "running";

  const filtered = useMemo(
    () => filterRequirements(tender.requirements, filter, query),
    [tender.requirements, filter, query],
  );

  function updateRequirement(updated: Requirement) {
    onTenderChange({
      ...tender,
      requirements: tender.requirements.map((r) => (r.id === updated.id ? updated : r)),
    });
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="space-y-5 min-w-0">
      {showBanner && (
        <DraftGenerationBanner tender={tender} onDone={() => setShowBanner(false)} />
      )}
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
            ? "No requirements extracted yet."
            : "No requirements match this filter."}
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
  );
}

function filterRequirements(
  reqs: Requirement[],
  filter: FilterKey,
  query: string,
): Requirement[] {
  const q = query.trim().toLowerCase();
  return reqs.filter((r) => {
    if (filter === "mandatory" && !r.is_mandatory) return false;
    if (filter === "optional" && r.is_mandatory) return false;
    if (filter === "covered" && r.match_status !== "fully_covered") return false;
    if (filter === "partial" && r.match_status !== "partially_covered") return false;
    if (filter === "missing" && r.match_status !== "not_covered") return false;
    if (filter === "unclear" && r.match_status !== "unclear") return false;
    if (q) {
      const hay =
        `${r.text} ${r.category ?? ""} ${r.source_excerpt ?? ""} ${r.draft_response ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
```

- [ ] **Step 2: Verify typecheck — should now pass**

```bash
cd "d:\Projects\Tender Response Assistant" && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 3: Run lint**

```bash
cd "d:\Projects\Tender Response Assistant" && npx eslint components/tabs/AnalysisTab.tsx components/TenderDashboard.tsx components/PipelineProgressBanner.tsx components/tabs/OverviewTab.tsx components/tabs/DocumentsTab.tsx components/tabs/RisksTab.tsx components/Tabs.tsx 2>&1 | head -40
```

Expected: zero lint errors.

- [ ] **Step 4: Commit**

```bash
cd "d:\Projects\Tender Response Assistant" && git add components/tabs/AnalysisTab.tsx && git commit -m "update AnalysisTab: remove SidePanel, accept counts prop from dashboard"
```

---

## Task 8: Delete SidePanel

**Files:**
- Delete: `components/SidePanel.tsx`

SidePanel is no longer imported anywhere after Task 7. Verify before deleting.

- [ ] **Step 1: Confirm no remaining imports**

```bash
cd "d:\Projects\Tender Response Assistant" && grep -r "SidePanel" components/ app/ lib/ 2>&1
```

Expected: zero matches. If any match appears, fix the import first.

- [ ] **Step 2: Delete the file**

```bash
cd "d:\Projects\Tender Response Assistant" && rm components/SidePanel.tsx
```

- [ ] **Step 3: Verify typecheck still passes**

```bash
cd "d:\Projects\Tender Response Assistant" && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd "d:\Projects\Tender Response Assistant" && git add -A && git commit -m "remove SidePanel: replaced by workspace tabs"
```

---

## Task 9: Final verification

**Files:** none (read-only)

- [ ] **Step 1: Full typecheck**

```bash
cd "d:\Projects\Tender Response Assistant" && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Full lint**

```bash
cd "d:\Projects\Tender Response Assistant" && npx eslint . --ext .ts,.tsx 2>&1 | head -60
```

Expected: zero errors (warnings acceptable).

- [ ] **Step 3: Confirm acceptance criteria**

Check each item against the spec:
- [ ] SidePanel component is gone; `components/SidePanel.tsx` does not exist.
- [ ] Six tabs visible in browser: Overview, Requirements, Documents, Risks, Capabilities, Export.
- [ ] Documents tab shows full-width list with click-to-cycle status.
- [ ] Risks tab shows full-width list, sorted critical → low.
- [ ] Evaluation criteria appears in Overview tab.
- [ ] Coverage stats visible in both Overview and Requirements tabs.
- [ ] PipelineProgressBanner appears below tab strip when any post-extraction stage is running or pending.
- [ ] Banner shows InkStroke on the active step, green dot on completed steps, faint dot on pending steps.
- [ ] Drafting step label shows "Drafting N of M responses." when total > 0.
- [ ] Banner fades out ~1.2 s after all stages complete.
- [ ] TenderHeader still shows active stage via existing `PipelineProgress` component (unchanged).
- [ ] Typecheck and lint pass.
