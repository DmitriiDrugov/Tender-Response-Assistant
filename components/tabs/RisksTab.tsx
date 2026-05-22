"use client";

import { useState } from "react";
import type { Risk, RiskDecision } from "@/lib/types";

function sevRank(s: Risk["severity"]): number {
  return s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;
}

function severityColor(s: Risk["severity"]): string {
  if (s === "critical") return "#ba1a1a";
  if (s === "high")     return "#93000a";
  if (s === "medium")   return "#7e775f";
  return "#4d4732";
}

const DECISION_LABELS: Record<RiskDecision, string> = {
  accept: "Accept",
  mitigate: "Mitigate",
  clarify: "Clarify",
  escalate_legal: "Escalate to legal",
  exclude_from_offer: "Exclude from offer",
  no_bid_trigger: "No-bid trigger",
  false_positive: "False positive",
};

const TEAMS = [
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

export function RisksTab({
  risks: initialRisks,
  onRiskUpdated,
}: {
  risks: Risk[];
  onRiskUpdated?: (r: Risk) => void;
}) {
  const [risks, setRisks] = useState<Risk[]>(initialRisks);
  const [showFP, setShowFP] = useState(false);

  const activeRisks = risks.filter((r) => !r.is_false_positive);
  const fpRisks = risks.filter((r) => r.is_false_positive);
  const displayed = showFP ? risks : activeRisks;
  const ordered = [...displayed].sort((a, b) => sevRank(a.severity) - sevRank(b.severity));

  async function patchRisk(id: string, fields: Partial<Risk>) {
    const res = await fetch(`/api/risks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as Risk;
    setRisks((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    onRiskUpdated?.(updated);
  }

  return (
    <section aria-label="Risks">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="font-serif text-25 text-on-surface leading-none">Risks</h2>
        <div className="flex items-center gap-5 text-12 text-on-surface-variant">
          <span className="tabular">{activeRisks.length} active</span>
          {fpRisks.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowFP((v) => !v)}
              className="link-accent"
            >
              {showFP ? "Hide" : "Show"} {fpRisks.length} false {fpRisks.length === 1 ? "positive" : "positives"}
            </button>
          ) : null}
        </div>
      </div>

      {ordered.length === 0 ? (
        <p className="text-14 text-on-surface-variant py-7">No active risks.</p>
      ) : (
        <ul className="border-t border-outline-variant divide-y divide-outline-variant">
          {ordered.map((r) => (
            <RiskItem key={r.id} risk={r} onPatch={(fields) => void patchRisk(r.id, fields)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RiskItem({
  risk: r,
  onPatch,
}: {
  risk: Risk;
  onPatch: (fields: Partial<Risk>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [mitigationText, setMitigationText] = useState(r.mitigation ?? "");
  const [saving, setSaving] = useState(false);

  const isFP = r.is_false_positive;

  async function saveMitigation() {
    if (mitigationText === (r.mitigation ?? "")) return;
    setSaving(true);
    onPatch({ mitigation: mitigationText || null });
    setSaving(false);
  }

  return (
    <li className={["py-4 space-y-2", isFP ? "opacity-40" : ""].join(" ")}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left space-y-2"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 text-12 uppercase tracking-wider">
          <span
            className="dot"
            style={{ background: isFP ? "#d0c6ab" : severityColor(r.severity) }}
            aria-hidden="true"
          />
          {isFP ? (
            <span className="text-on-surface-variant">False positive</span>
          ) : (
            <span style={{ color: severityColor(r.severity) }} className="font-medium">
              {r.severity}
            </span>
          )}
          <span className="text-on-surface-variant normal-case tracking-normal">{r.category}</span>
          {r.decision && !isFP ? (
            <span className="ml-auto text-on-surface-variant normal-case tracking-normal">
              {DECISION_LABELS[r.decision]}
            </span>
          ) : null}
        </div>
        <p className="text-14 text-on-surface leading-snug text-left">{r.description}</p>
        {r.source_location ? (
          <p className="text-12 text-on-surface-variant font-mono">{r.source_location}</p>
        ) : null}
      </button>

      {r.business_impact ? (
        <p className="text-13 text-on-surface-variant">
          <span className="label mr-1.5">Business impact</span>
          {r.business_impact}
        </p>
      ) : null}

      {r.recommended_action && !expanded ? (
        <p className="text-13 text-on-surface-variant">
          <span className="label mr-1.5">Action</span>
          {r.recommended_action}
        </p>
      ) : null}

      {expanded ? (
        <div className="pt-2 space-y-4">
          {r.recommended_action ? (
            <p className="text-13 text-on-surface-variant">
              <span className="label mr-1.5">Recommended action</span>
              {r.recommended_action}
            </p>
          ) : null}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="label text-12">Decision</label>
              <select
                value={r.decision ?? ""}
                onChange={(e) => onPatch({ decision: (e.target.value as RiskDecision) || null })}
                className="w-full h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
                aria-label="Risk decision"
              >
                <option value="">— Select —</option>
                {(Object.entries(DECISION_LABELS) as [RiskDecision, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="label text-12">Team</label>
              <select
                value={r.team ?? ""}
                onChange={(e) => onPatch({ team: e.target.value || null })}
                className="w-full h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
                aria-label="Responsible team"
              >
                <option value="">— Select —</option>
                {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="label text-12">Owner</label>
              <OwnerInput
                value={r.owner_name ?? ""}
                onCommit={(v) => onPatch({ owner_name: v || null })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="label text-12">Mitigation note</label>
            <textarea
              value={mitigationText}
              onChange={(e) => setMitigationText(e.target.value)}
              onBlur={saveMitigation}
              placeholder="Describe how this risk will be mitigated..."
              className="w-full min-h-[4rem] bg-surface border border-outline px-3 py-2 text-14 text-on-surface focus:outline-none focus:border-on-surface"
              aria-label="Mitigation note"
            />
            {saving ? <p className="text-12 text-on-surface-variant">Saving.</p> : null}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onPatch({ is_false_positive: !r.is_false_positive, false_positive_reason: null })}
              className={["industrial-border px-4 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-variant transition-colors", r.is_false_positive ? "bg-primary text-on-primary" : ""].join(" ")}
              aria-pressed={r.is_false_positive}
            >
              {r.is_false_positive ? "Unmark false positive" : "Mark false positive"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-12 text-on-surface-variant hover:text-on-surface transition-colors duration-160"
        >
          Manage risk →
        </button>
      )}
    </li>
  );
}

function OwnerInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onCommit(local); }}
      onKeyDown={(e) => { if (e.key === "Enter") onCommit(local); }}
      placeholder="Name"
      className="w-full h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
      aria-label="Risk owner"
    />
  );
}
