"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, RefreshCcw } from "lucide-react";
import { InkStroke } from './InkStroke';
import { DraftStatusBadge } from './DraftStatusBadge';
import type { Capability, Requirement, MatchStatus } from "@/lib/types";
import { STATUS_LABEL, StatusDot } from "./StatusDot";
import { cn, formatRelativeTime } from "@/lib/utils";

const AUTOSAVE_MS = 800;

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
}

function MandatoryBadge({ mandatory }: { mandatory: boolean }) {
  if (!mandatory)
    return <span className="hidden md:inline text-12 text-ink-faint uppercase tracking-wider">Optional</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-12 uppercase tracking-wider font-medium text-accent">
      <span className="dot" style={{ background: "var(--accent)" }} />
      Required
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Requirement["confidence"] }) {
  if (!confidence)
    return <span className="hidden lg:inline text-12 text-ink-faint">—</span>;
  return (
    <span
      className="hidden lg:inline text-12 text-ink-muted uppercase tracking-wider"
      title={`Model confidence in the match classification: ${confidence}`}
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
    <div className="bg-surface-sunk border-t border-border px-5 py-6 space-y-6 animate-fade-in">
      {r.source_excerpt ? (
        <section aria-labelledby={`source-${r.id}`}>
          <div id={`source-${r.id}`} className="label mb-2">
            Source quote
          </div>
          <blockquote className="bg-surface-2 px-5 py-4 font-serif text-16 leading-relaxed text-ink-2 max-w-reading relative">
            <span
              aria-hidden="true"
              className="absolute -top-1 left-2 font-serif text-25 text-ink-muted leading-none select-none"
            >
              “
            </span>
            <span className="block pl-5">{r.source_excerpt}</span>
          </blockquote>
        </section>
      ) : null}

      {matched.length > 0 ? (
        <section>
          <div className="label mb-2">Matched capabilities</div>
          <ul className="flex flex-wrap gap-2">
            {matched.map((c) => (
              <li
                key={c.id}
                className="inline-flex items-center gap-2 px-2.5 py-1 text-12 uppercase tracking-wider"
                style={{ color: "var(--accent-ink)", background: "var(--accent-tint)" }}
                title={c.description || ""}
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-ink-muted normal-case tracking-normal text-12">{c.category}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {r.gap_description ? (
        <section className="max-w-reading">
          <div className="label mb-2">Gap</div>
          <p className="font-serif text-16 leading-relaxed text-ink-2">{r.gap_description}</p>
        </section>
      ) : null}

      {r.suggested_action ? (
        <section className="max-w-reading">
          <div className="label mb-2">Suggested action</div>
          <p className="font-serif text-16 leading-relaxed text-ink-2">{r.suggested_action}</p>
        </section>
      ) : null}

      <DraftEditor requirement={r} onUpdated={onUpdated} />

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
          {(r.draft_response ?? '')
            .replace(/^\[REQUIRES BID MANAGER DECISION\]\s*/i, '')
            .trim() || 'Draft requires bid manager decision.'}
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

        <label className="flex items-center gap-2 text-12 text-ink-muted">
          <span className="label">Override match</span>
          <select
            value={r.match_status ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              void overrideMatch(v as MatchStatus);
            }}
            className="h-8 px-2 bg-surface border border-border-strong text-13 text-ink"
            aria-label="Manually override the match status"
          >
            <option value="">—</option>
            <option value="fully_covered">{STATUS_LABEL.fully_covered}</option>
            <option value="partially_covered">{STATUS_LABEL.partially_covered}</option>
            <option value="not_covered">{STATUS_LABEL.not_covered}</option>
            <option value="unclear">{STATUS_LABEL.unclear}</option>
          </select>
          {r.overridden_by_user ? (
            <span className="text-12 text-ink-muted">manually set</span>
          ) : null}
        </label>
      </div>
    </section>
  );
}
