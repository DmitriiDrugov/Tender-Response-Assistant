"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, RefreshCcw } from "lucide-react";
import { InkStroke } from './InkStroke';
import { DraftStatusBadge } from './DraftStatusBadge';
import type { Capability, Requirement, MatchStatus, WorkflowStatus, Team } from "@/lib/types";
import { STATUS_LABEL, StatusDot } from "./StatusDot";
import { cn, formatRelativeTime } from "@/lib/utils";

const AUTOSAVE_MS = 800;

// Business-friendly match status labels
const BUSINESS_STATUS_LABEL: Record<string, string> = {
  fully_covered: "Ready for review",
  partially_covered: "Needs input",
  not_covered: "Gap",
  unclear: "Clarification needed",
};

const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  not_started: "Not started",
  waiting_input: "Waiting input",
  in_progress: "In progress",
  in_review: "In review",
  blocked: "Blocked",
  done: "Done",
  not_applicable: "N/A",
};

const TEAMS: Team[] = [
  "Bid Manager",
  "Warehouse Operations",
  "IT / WMS",
  "Legal",
  "Pricing",
  "Purchasing",
  "Project Manager",
  "LSP Partner",
  "EHS",
];

const NEXT_ACTIONS = [
  "No action needed",
  "Ready for review",
  "Ask Operations for evidence",
  "Ask IT/WMS owner",
  "Prepare document",
  "Send clarification question",
  "Add scope exception",
  "Legal review required",
  "Pricing input required",
  "Mark as not applicable",
];

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
  const r = requirement;
  const matchedCaps = r.matched_capability_ids
    .map((id) => capabilities.find((c) => c.id === id))
    .filter((c): c is Capability => !!c);

  return (
    <li className="border-b border-outline-variant">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          'w-full text-left py-3 px-5 grid items-center gap-5',
          'hover:bg-surface-container-low transition-colors duration-160 ease-out',
          draftingRunning
            ? '[grid-template-columns:auto_1fr_auto_auto_auto_auto_auto_auto]'
            : '[grid-template-columns:auto_1fr_auto_auto_auto_auto_auto]',
        )}
      >
        <StatusDot status={r.match_status} ring={r.overridden_by_user} />
        <span className="text-14 text-on-surface line-clamp-2">{r.text}</span>
        {r.requirement_type ? (
          <span className="hidden lg:inline text-12 text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
            {r.requirement_type}
          </span>
        ) : r.category ? (
          <span className="hidden md:inline text-12 text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
            {r.category}
          </span>
        ) : (
          <span />
        )}
        <MandatoryBadge mandatory={r.is_mandatory} />
        {r.match_status ? (
          <span className="hidden xl:inline text-12 text-on-surface-variant whitespace-nowrap">
            {BUSINESS_STATUS_LABEL[r.match_status] ?? r.match_status}
          </span>
        ) : <span />}
        <ConfidenceBadge confidence={r.confidence} />
        {draftingRunning ? <DraftStatusBadge status={r.draft_status} /> : null}
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={cn(
            'text-on-surface-variant transition-transform duration-240 ease-out',
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
}

function MandatoryBadge({ mandatory }: { mandatory: boolean }) {
  if (!mandatory)
    return <span className="hidden md:inline text-12 text-outline uppercase tracking-wider">Optional</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-12 uppercase tracking-wider font-medium text-accent">
      <span className="dot" style={{ background: "var(--accent)" }} />
      Required
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Requirement["confidence"] }) {
  if (!confidence)
    return <span className="hidden lg:inline text-12 text-outline">—</span>;
  return (
    <span
      className="hidden lg:inline text-12 text-on-surface-variant uppercase tracking-wider"
      title="Model confidence in the match classification"
    >
      {confidence}
    </span>
  );
}

function ExpandedPanel({
  requirement,
  matched,
  capabilities,
  onUpdated,
}: {
  requirement: Requirement;
  matched: Capability[];
  capabilities: Capability[];
  onUpdated: (r: Requirement) => void;
}) {
  const r = requirement;
  return (
    <div className="bg-surface-container-low border-t border-outline-variant px-5 py-6 space-y-6 animate-fade-in">
      {/* Source quote */}
      {r.source_excerpt ? (
        <section aria-labelledby={`source-${r.id}`}>
          <div id={`source-${r.id}`} className="label mb-2">Source quote</div>
          <blockquote className="bg-surface-container px-5 py-4 font-serif text-16 leading-relaxed text-on-surface-variant max-w-reading relative">
            <span aria-hidden="true" className="absolute -top-1 left-2 font-serif text-25 text-on-surface-variant leading-none select-none">"</span>
            <span className="block pl-5">{r.source_excerpt}</span>
          </blockquote>
          {r.confidence_reason ? (
            <p className="text-12 text-on-surface-variant mt-2">
              <span className="label mr-1.5">Classification basis</span>
              {r.confidence_reason}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Requirement → Capability → Gap → Action chain */}
      {matched.length > 0 ? (
        <section>
          <div className="label mb-2">Matched capabilities</div>
          <ul className="flex flex-wrap gap-2">
            {matched.map((c) => (
              <li
                key={c.id}
                className="inline-flex items-center gap-2 px-2.5 py-1 text-12 uppercase tracking-wider"
                style={{ color: "#705d00", background: "var(--accent-tint)" }}
                title={c.description || ""}
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-on-surface-variant normal-case tracking-normal text-12">{c.category}</span>
              </li>
            ))}
          </ul>
          {r.evidence_strength ? (
            <p className="text-12 text-on-surface-variant mt-2">
              <span className="label mr-1.5">Evidence strength</span>
              <span className="capitalize">{r.evidence_strength}</span>
            </p>
          ) : null}
          {r.evidence_used && r.evidence_used.length > 0 ? (
            <div className="mt-3 space-y-1">
              <div className="label">Evidence used</div>
              <ul className="space-y-0.5">
                {r.evidence_used.map((e, i) => (
                  <li key={i} className="text-13 text-on-surface-variant flex items-start gap-2">
                    <span className="dot mt-1.5 flex-shrink-0" style={{ background: "#d0c6ab" }} />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {r.gap_description ? (
        <section className="max-w-reading">
          <div className="label mb-2">Gap</div>
          <p className="font-serif text-16 leading-relaxed text-on-surface-variant">{r.gap_description}</p>
        </section>
      ) : null}

      {r.suggested_action ? (
        <section className="max-w-reading">
          <div className="label mb-2">Suggested action</div>
          <p className="font-serif text-16 leading-relaxed text-on-surface-variant">{r.suggested_action}</p>
        </section>
      ) : null}

      {r.ai_assumptions ? (
        <section className="max-w-reading">
          <div className="label mb-2">AI assumptions</div>
          <p className="text-13 text-on-surface-variant italic">{r.ai_assumptions}</p>
        </section>
      ) : null}

      <DraftEditor requirement={r} onUpdated={onUpdated} />

      <WorkflowPanel requirement={r} onUpdated={onUpdated} />

      <ReviewerControls
        requirement={r}
        capabilities={capabilities}
        onUpdated={onUpdated}
      />
    </div>
  );
}

function DraftEditor({
  requirement,
  onUpdated,
}: {
  requirement: Requirement;
  onUpdated: (r: Requirement) => void;
}) {
  const status = requirement.draft_status;

  if (status === 'pending') {
    return (
      <section className="space-y-2">
        <div className="label">Draft response</div>
        <p className="text-14 text-on-surface-variant">Draft response not generated yet.</p>
      </section>
    );
  }

  if (status === 'generating') {
    return (
      <section className="space-y-2">
        <div className="label">Draft response</div>
        <div className="flex items-center gap-3 text-14 text-on-surface-variant">
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
        <p className="text-14 text-on-surface-variant">This requirement was skipped during drafting.</p>
      </section>
    );
  }

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
  const [saving, setSaving]             = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [pendingRegen, setPendingRegen] = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const timer                           = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef                     = useRef(value);
  const labelId                         = useId();

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
      // Show pending diff — user must accept before overwriting
      setPendingRegen(updated.draft_response ?? '');
      onUpdated(updated);
    } catch {
      setError('Network error during regenerate.');
    } finally {
      setRegenerating(false);
    }
  }, [r.id, onUpdated]);

  const acceptRegen = () => {
    if (pendingRegen === null) return;
    setValue(pendingRegen);
    lastSentRef.current = pendingRegen;
    setPendingRegen(null);
  };

  const rejectRegen = () => setPendingRegen(null);

  const isBlocked = r.draft_status === 'blocked';
  const isFailed  = r.draft_status === 'failed';

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label id={labelId} className="label">Draft response</label>
        {!isBlocked && !isFailed ? (
          <div className="text-12 text-on-surface-variant tabular">
            {saving
              ? 'Saving.'
              : savedAt
                ? `Saved ${formatRelativeTime(savedAt.toISOString()) || 'just now'}`
                : ''}
          </div>
        ) : null}
      </div>

      {isBlocked ? (
        <p className="text-14 text-on-surface-variant">
          {(r.draft_response ?? '')
            .replace(/^\[REQUIRES BID MANAGER DECISION\]\s*/i, '')
            .trim() || 'Draft requires bid manager decision.'}
        </p>
      ) : isFailed ? (
        <p className="text-14 text-accent">Draft generation failed.</p>
      ) : (
        <>
          {pendingRegen !== null ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="label text-12 text-on-surface-variant">Current draft</p>
                <p className="text-14 text-on-surface-variant line-through">{value || '(empty)'}</p>
              </div>
              <div className="space-y-1">
                <p className="label text-12">Regenerated draft</p>
                <p className="font-serif text-16 leading-relaxed text-on-surface">{pendingRegen}</p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={acceptRegen} className="btn btn-sm btn-primary">Accept</button>
                <button type="button" onClick={rejectRegen} className="btn btn-sm">Reject</button>
              </div>
            </div>
          ) : (
            <textarea
              aria-labelledby={labelId}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full min-h-[8rem] bg-surface border border-outline px-4 py-3 font-serif text-16 leading-relaxed text-on-surface focus:outline-none focus:border-on-surface"
            />
          )}
        </>
      )}

      {error ? (
        <p role="alert" className="text-12 text-accent">{error}</p>
      ) : null}

      {pendingRegen === null ? (
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
      ) : null}
    </section>
  );
}

function WorkflowPanel({
  requirement,
  onUpdated,
}: {
  requirement: Requirement;
  onUpdated: (r: Requirement) => void;
}) {
  const r = requirement;
  const [saving, setSaving] = useState(false);

  async function patch(fields: Partial<Pick<Requirement, "next_action" | "owner_name" | "team" | "due_date" | "workflow_status">>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/requirements/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) onUpdated((await res.json()) as Requirement);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="label">Workflow</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="label text-12">Next action</label>
          <select
            value={r.next_action ?? ""}
            onChange={(e) => void patch({ next_action: e.target.value || null })}
            disabled={saving}
            className="w-full h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
            aria-label="Next action"
          >
            <option value="">— Select —</option>
            {NEXT_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="label text-12">Status</label>
          <select
            value={r.workflow_status}
            onChange={(e) => void patch({ workflow_status: e.target.value as WorkflowStatus })}
            disabled={saving}
            className="w-full h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
            aria-label="Workflow status"
          >
            {(Object.keys(WORKFLOW_STATUS_LABELS) as WorkflowStatus[]).map((s) => (
              <option key={s} value={s}>{WORKFLOW_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="label text-12">Team</label>
          <select
            value={r.team ?? ""}
            onChange={(e) => void patch({ team: e.target.value || null })}
            disabled={saving}
            className="w-full h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
            aria-label="Team"
          >
            <option value="">— Select —</option>
            {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="label text-12">Owner</label>
          <OwnerInput value={r.owner_name ?? ""} onCommit={(v) => void patch({ owner_name: v || null })} disabled={saving} />
        </div>
      </div>
      {r.due_date !== undefined && (
        <div className="space-y-1 max-w-[12rem]">
          <label className="label text-12">Due date</label>
          <input
            type="date"
            value={r.due_date ?? ""}
            onChange={(e) => void patch({ due_date: e.target.value || null })}
            disabled={saving}
            className="w-full h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
            aria-label="Due date"
          />
        </div>
      )}
    </section>
  );
}

function OwnerInput({ value, onCommit, disabled }: { value: string; onCommit: (v: string) => void; disabled: boolean }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onCommit(local); }}
      onKeyDown={(e) => { if (e.key === "Enter") onCommit(local); }}
      disabled={disabled}
      placeholder="Name"
      className="w-full h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
      aria-label="Owner name"
    />
  );
}

function ReviewerControls({
  requirement,
  capabilities,
  onUpdated,
}: {
  requirement: Requirement;
  capabilities: Capability[];
  onUpdated: (r: Requirement) => void;
}) {
  const r = requirement;
  const reviewed = r.reviewed_at != null;
  const [notes, setNotes] = useState(r.reviewer_notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNotesRef = useRef(notes);

  useEffect(() => {
    setNotes(r.reviewer_notes ?? "");
    lastNotesRef.current = r.reviewer_notes ?? "";
  }, [r.id, r.reviewer_notes]);

  useEffect(() => {
    if (notes === lastNotesRef.current) return;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/requirements/${r.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewer_notes: notes }),
        });
        if (!res.ok) {
          const d = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(d?.error || "Save failed.");
          return;
        }
        const updated = (await res.json()) as Requirement;
        lastNotesRef.current = updated.reviewer_notes ?? "";
        setError(null);
        onUpdated(updated);
      } catch {
        setError("Network error. Will retry on next change.");
      }
    }, AUTOSAVE_MS);
    return () => {
      if (notesTimer.current) clearTimeout(notesTimer.current);
    };
  }, [notes, r.id, onUpdated]);

  async function toggleReviewed() {
    const res = await fetch(`/api/requirements/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewed: !reviewed }),
    });
    if (res.ok) onUpdated((await res.json()) as Requirement);
  }

  async function overrideMatch(s: MatchStatus) {
    const res = await fetch(`/api/requirements/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_status: s }),
    });
    if (res.ok) onUpdated((await res.json()) as Requirement);
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2 max-w-reading">
        <label htmlFor={`notes-${r.id}`} className="label">
          Reviewer notes
        </label>
        <textarea
          id={`notes-${r.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes (not exported)."
          className="input text-14 min-h-[4rem]"
        />
        {error ? (
          <p role="alert" className="text-12 text-accent">{error}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={toggleReviewed}
          className={cn("btn btn-sm", reviewed && "btn-primary")}
          aria-pressed={reviewed}
        >
          <Check size={14} strokeWidth={1.5} aria-hidden="true" />
          {reviewed ? "Reviewed" : "Mark reviewed"}
        </button>

        <label className="flex items-center gap-2 text-12 text-on-surface-variant">
          <span className="label">Override match</span>
          <select
            value={r.match_status ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              void overrideMatch(v as MatchStatus);
            }}
            className="h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
            aria-label="Manually override the match status"
          >
            <option value="">—</option>
            <option value="fully_covered">{STATUS_LABEL.fully_covered}</option>
            <option value="partially_covered">{STATUS_LABEL.partially_covered}</option>
            <option value="not_covered">{STATUS_LABEL.not_covered}</option>
            <option value="unclear">{STATUS_LABEL.unclear}</option>
          </select>
          {r.overridden_by_user ? (
            <span className="text-12 text-on-surface-variant">manually set</span>
          ) : null}
        </label>
      </div>
    </section>
  );
}
