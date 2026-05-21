"use client";

import { useEffect, useMemo, useState } from "react";
import type { Capability, Requirement, TenderFull } from "@/lib/types";
import { CoverageStats } from "../CoverageStats";
import { DraftGenerationBanner } from "../DraftGenerationBanner";
import { FilterStrip, type FilterKey } from "../FilterStrip";
import { RequirementRow } from "../RequirementRow";
import { SidePanel } from "../SidePanel";

export function AnalysisTab({
  tender,
  capabilities,
  onTenderChange,
  onRefresh,
}: {
  tender: TenderFull;
  capabilities: Capability[];
  onTenderChange: (t: TenderFull) => void;
  onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showBanner, setShowBanner] = useState(tender.drafting_status === 'running');

  useEffect(() => {
    if (tender.drafting_status === 'running') setShowBanner(true);
  }, [tender.drafting_status]);

  const draftingRunning = tender.drafting_status === 'running';

  const filtered = useMemo(() => filterRequirements(tender.requirements, filter, query), [
    tender.requirements,
    filter,
    query,
  ]);

  const counts = useMemo(() => {
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
    for (const r of tender.requirements) {
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
  }, [tender.requirements]);

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
    <div className="grid gap-7 lg:grid-cols-[1fr_22rem] items-start">
      <section className="space-y-5 min-w-0">
        {showBanner && (
          <DraftGenerationBanner
            tender={tender}
            onDone={() => setShowBanner(false)}
          />
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

      <SidePanel tender={tender} onRefresh={onRefresh} />
    </div>
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
      const hay = `${r.text} ${r.category ?? ""} ${r.source_excerpt ?? ""} ${r.draft_response ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
