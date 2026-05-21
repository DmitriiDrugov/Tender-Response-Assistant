"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Capability, ClarificationQuestion, RequirementCounts, TenderFull } from "@/lib/types";
import { TenderHeader } from "./TenderHeader";
import { Tabs } from "./Tabs";
import { AnalysisTab } from "./tabs/AnalysisTab";
import { CapabilitiesTab } from "./tabs/CapabilitiesTab";
import { ExportTab } from "./tabs/ExportTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { RisksTab } from "./tabs/RisksTab";
import { ClarificationsTab } from "./tabs/ClarificationsTab";
import { ActionPlanTab } from "./tabs/ActionPlanTab";
import { AnalysisProgressScreen } from "./AnalysisProgressScreen";
import { PipelineProgressBanner } from "./PipelineProgressBanner";
import { RedFlagBanner } from "./RedFlagBanner";

type TabKey =
  | "overview"
  | "requirements"
  | "documents"
  | "risks"
  | "clarifications"
  | "action_plan"
  | "capabilities"
  | "export";

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

function computeCounts(requirements: TenderFull["requirements"]): RequirementCounts {
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

  const missingDocBadge = tender.required_documents.filter(
    (d) => d.status === "missing" || d.status === "requested",
  ).length;
  const highRiskBadge = tender.risks.filter(
    (r) => (r.severity === "critical" || r.severity === "high") && !r.is_false_positive && !r.decision,
  ).length;
  const clarificationBadge = tender.clarification_questions.filter(
    (q) => q.status === "draft",
  ).length;

  const actionPlanBadge = useMemo(() => {
    const critical = counts.missing_mandatory;
    const missingDocs = tender.required_documents.filter((d) => d.status === "missing").length;
    const blockedDrafts = tender.requirements.filter((r) => r.draft_status === "blocked").length;
    return critical + missingDocs + blockedDrafts + highRiskBadge;
  }, [counts.missing_mandatory, tender.required_documents, tender.requirements, highRiskBadge]);

  const refreshTender = useCallback(async () => {
    const res = await fetch(`/api/tenders/${tender.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as TenderFull;
    // Preserve clarification_questions from local state if not in API response
    setTender((prev) => ({
      ...data,
      clarification_questions: data.clarification_questions ?? prev.clarification_questions,
    }));
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

  function handleClarificationsChange(qs: ClarificationQuestion[]) {
    setTender((prev) => ({ ...prev, clarification_questions: qs }));
  }

  function handleRiskUpdated() {
    void refreshTender();
  }

  return (
    <>
      {showOverlay && (
        <AnalysisProgressScreen
          tender={tender}
          onDismissed={() => setShowOverlay(false)}
        />
      )}
      <div className="flex flex-col min-h-screen">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant/30 flex flex-col px-8 py-4 gap-4">
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
              {
                key: "clarifications",
                label: "Clarifications",
                badge: clarificationBadge > 0 ? clarificationBadge : undefined,
                count: clarificationBadge === 0 ? tender.clarification_questions.length : undefined,
              },
              {
                key: "action_plan",
                label: "Action plan",
                badge: actionPlanBadge > 0 ? actionPlanBadge : undefined,
              },
              { key: "capabilities", label: "Capabilities" },
              { key: "export", label: "Export" },
            ]}
            active={tab}
            onChange={(k) => setTab(k as TabKey)}
          />
        </header>

        {/* Content */}
        <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
          {tender.extraction_status === "complete" && (
            <PipelineProgressBanner tender={tender} />
          )}
          {tender.extraction_status === "complete" && (
            <RedFlagBanner tender={tender} onViewBlockers={() => setTab("action_plan")} />
          )}

          {tab === "overview" && <OverviewTab tender={tender} counts={counts} />}
          {tab === "requirements" && (
            <AnalysisTab tender={tender} capabilities={capabilities} counts={counts} onTenderChange={setTender} />
          )}
          {tab === "documents" && (
            <DocumentsTab docs={tender.required_documents} onRefresh={refreshTender} />
          )}
          {tab === "risks" && (
            <RisksTab risks={tender.risks} onRiskUpdated={handleRiskUpdated} />
          )}
          {tab === "clarifications" && (
            <ClarificationsTab
              tenderId={tender.id}
              questions={tender.clarification_questions}
              onQuestionsChange={handleClarificationsChange}
            />
          )}
          {tab === "action_plan" && <ActionPlanTab tender={tender} />}
          {tab === "capabilities" && (
            <CapabilitiesTab
              tenderId={tender.id}
              capabilities={capabilities}
              onCapabilitiesChange={setCapabilities}
              onRefreshCapabilities={refreshCapabilities}
              onRefreshTender={refreshTender}
            />
          )}
          {tab === "export" && <ExportTab tender={tender} />}
        </div>

        {/* Footer action bar */}
        <footer className="border-t border-outline-variant/30 bg-surface px-8 py-6 flex justify-between items-center">
          <div className="flex gap-4">
            <button className="flex items-center gap-2 industrial-border px-4 py-2 font-label-md text-label-md uppercase hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-sm">share</span>
              Collaborate
            </button>
            <button className="flex items-center gap-2 industrial-border px-4 py-2 font-label-md text-label-md uppercase hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-sm">history</span>
              Revision History
            </button>
          </div>
          <div className="flex gap-4">
            <button className="bg-surface-container-lowest industrial-border px-6 py-3 font-label-md text-label-md uppercase hover:bg-surface-container transition-colors">
              Save Draft
            </button>
            <button className="bg-primary text-on-primary px-8 py-3 font-label-md text-label-md uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(112,93,0,0.3)] active:translate-y-0.5 active:shadow-none">
              Submit Package
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
