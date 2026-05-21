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
