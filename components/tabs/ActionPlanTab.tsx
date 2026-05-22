"use client";

import { useMemo, useState } from "react";
import type { TenderFull } from "@/lib/types";

type Priority = "critical" | "high" | "medium" | "low";
type ActionItem = {
  id: string;
  priority: Priority;
  action: string;
  source: string;
  sourceType: "requirement" | "risk" | "document" | "clarification";
  owner: string | null;
  team: string | null;
  due_date: string | null;
  status: string;
  blocker: string | null;
};

function priorityRank(p: Priority): number {
  return p === "critical" ? 0 : p === "high" ? 1 : p === "medium" ? 2 : 3;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  critical: "#ba1a1a",
  high: "#93000a",
  medium: "#7e775f",
  low: "#d0c6ab",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function deriveActionItems(tender: TenderFull): ActionItem[] {
  const items: ActionItem[] = [];

  // Missing required documents
  for (const doc of tender.required_documents) {
    if (doc.status === "missing" || doc.status === "requested") {
      items.push({
        id: `doc-${doc.id}`,
        priority: doc.is_required ? "high" : "medium",
        action: `Prepare document: ${doc.name}`,
        source: doc.source_section ? `Required documents — ${doc.source_section}` : "Required documents",
        sourceType: "document",
        owner: doc.owner_name,
        team: null,
        due_date: doc.due_date,
        status: doc.status === "missing" ? "Not started" : "Requested",
        blocker: null,
      });
    }
  }

  // Missing mandatory requirements
  for (const req of tender.requirements) {
    if (req.is_mandatory && req.match_status === "not_covered") {
      items.push({
        id: `req-missing-${req.id}`,
        priority: "critical",
        action: req.next_action ?? `Resolve mandatory gap: ${req.text.slice(0, 80)}`,
        source: `Requirement — ${req.category ?? "General"}`,
        sourceType: "requirement",
        owner: req.owner_name,
        team: req.team,
        due_date: req.due_date,
        status: "Gap — no coverage",
        blocker: req.gap_description ?? null,
      });
    } else if (req.match_status === "partially_covered" && req.next_action) {
      items.push({
        id: `req-partial-${req.id}`,
        priority: req.is_mandatory ? "high" : "medium",
        action: req.next_action,
        source: `Requirement — ${req.category ?? "General"}`,
        sourceType: "requirement",
        owner: req.owner_name,
        team: req.team,
        due_date: req.due_date,
        status: "Partial coverage",
        blocker: req.gap_description ?? null,
      });
    } else if (req.match_status === "unclear" && req.next_action) {
      items.push({
        id: `req-unclear-${req.id}`,
        priority: req.is_mandatory ? "high" : "low",
        action: req.next_action,
        source: `Requirement — ${req.category ?? "General"}`,
        sourceType: "requirement",
        owner: req.owner_name,
        team: req.team,
        due_date: req.due_date,
        status: "Clarification needed",
        blocker: null,
      });
    } else if (req.draft_status === "blocked") {
      items.push({
        id: `req-blocked-${req.id}`,
        priority: req.is_mandatory ? "high" : "medium",
        action: `Unblock draft: ${req.text.slice(0, 80)}`,
        source: `Requirement — ${req.category ?? "General"}`,
        sourceType: "requirement",
        owner: req.owner_name,
        team: req.team,
        due_date: req.due_date,
        status: "Draft blocked",
        blocker: req.gap_description ?? null,
      });
    }
  }

  // Risks without decision
  for (const risk of tender.risks) {
    if (!risk.is_false_positive && !risk.decision) {
      items.push({
        id: `risk-${risk.id}`,
        priority: risk.severity === "critical" ? "critical" : risk.severity === "high" ? "high" : "medium",
        action: risk.recommended_action ?? `Review risk: ${risk.description.slice(0, 80)}`,
        source: `Risk — ${risk.category}`,
        sourceType: "risk",
        owner: risk.owner_name,
        team: risk.team,
        due_date: null,
        status: "No decision",
        blocker: null,
      });
    }
  }

  // Pending clarification questions
  for (const q of tender.clarification_questions) {
    if (q.status === "draft" || q.status === "approved") {
      items.push({
        id: `clar-${q.id}`,
        priority: q.priority as Priority,
        action: `Send clarification: ${q.question_text.slice(0, 80)}`,
        source: "Clarification questions",
        sourceType: "clarification",
        owner: null,
        team: null,
        due_date: null,
        status: q.status === "draft" ? "Draft" : "Approved — not sent",
        blocker: null,
      });
    }
  }

  return items.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}

type TeamFilter = string | null;
type SourceFilter = ActionItem["sourceType"] | "all";

export function ActionPlanTab({ tender }: { tender: TenderFull }) {
  const items = useMemo(() => deriveActionItems(tender), [tender]);
  const [teamFilter, setTeamFilter] = useState<TeamFilter>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const teams = Array.from(new Set(items.map((i) => i.team).filter(Boolean))) as string[];

  const filtered = items.filter((i) => {
    if (teamFilter && i.team !== teamFilter) return false;
    if (sourceFilter !== "all" && i.sourceType !== sourceFilter) return false;
    return true;
  });

  return (
    <section aria-label="Action plan">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="font-serif text-25 text-on-surface leading-none">Action plan</h2>
        <span className="text-12 text-on-surface-variant tabular">{filtered.length} items</span>
      </div>

      {items.length === 0 ? (
        <p className="text-14 text-on-surface-variant py-7">
          No open action items. All requirements, risks and documents are resolved.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4 text-13">
            <span className="label">Filter</span>
            <button
              type="button"
              onClick={() => setSourceFilter("all")}
              className={["px-3 h-7 text-12 border transition-colors duration-160", sourceFilter === "all" ? "border-outline bg-surface text-on-surface" : "border-transparent text-on-surface-variant hover:text-on-surface"].join(" ")}
            >
              All sources
            </button>
            {(["requirement", "risk", "document", "clarification"] as SourceFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSourceFilter(s)}
                className={["px-3 h-7 text-12 border transition-colors duration-160", sourceFilter === s ? "border-outline bg-surface text-on-surface" : "border-transparent text-on-surface-variant hover:text-on-surface"].join(" ")}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}s
              </button>
            ))}
            {teams.length > 0 ? (
              <>
                <span className="text-outline">|</span>
                <select
                  value={teamFilter ?? ""}
                  onChange={(e) => setTeamFilter(e.target.value || null)}
                  className="h-7 px-2 bg-surface border border-outline-variant text-12 text-on-surface"
                  aria-label="Filter by team"
                >
                  <option value="">All teams</option>
                  {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </>
            ) : null}
          </div>

          <table className="w-full text-13">
            <thead>
              <tr className="border-b border-outline-variant text-12 text-on-surface-variant uppercase tracking-wider">
                <th className="text-left py-2 pr-4 w-[6rem]">Priority</th>
                <th className="text-left py-2 pr-4">Action</th>
                <th className="text-left py-2 pr-4 hidden md:table-cell">Source</th>
                <th className="text-left py-2 pr-4 hidden lg:table-cell w-[8rem]">Owner / Team</th>
                <th className="text-left py-2 pr-4 hidden lg:table-cell w-[7rem]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="py-3 pr-4">
                    <span
                      className="inline-flex items-center gap-1.5 text-12 uppercase tracking-wider"
                      style={{ color: PRIORITY_COLOR[item.priority] }}
                    >
                      <span className="dot" style={{ background: PRIORITY_COLOR[item.priority] }} />
                      {PRIORITY_LABEL[item.priority]}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-on-surface leading-snug">{item.action}</p>
                    {item.blocker ? (
                      <p className="text-12 text-on-surface-variant mt-0.5 italic">{item.blocker}</p>
                    ) : null}
                    {item.due_date ? (
                      <p className="text-12 text-on-surface-variant mt-0.5">Due {item.due_date}</p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 hidden md:table-cell text-on-surface-variant">{item.source}</td>
                  <td className="py-3 pr-4 hidden lg:table-cell text-on-surface-variant">
                    {item.owner ?? item.team ?? "—"}
                  </td>
                  <td className="py-3 pr-4 hidden lg:table-cell text-on-surface-variant">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
