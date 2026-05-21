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
