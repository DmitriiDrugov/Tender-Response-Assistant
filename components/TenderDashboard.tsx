"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TenderFull, Capability } from "@/lib/types";
import { TenderHeader } from "./TenderHeader";
import { Tabs } from "./Tabs";
import { AnalysisTab } from "./tabs/AnalysisTab";
import { CapabilitiesTab } from "./tabs/CapabilitiesTab";
import { ExportTab } from "./tabs/ExportTab";

type TabKey = "analysis" | "capabilities" | "export";

function pipelineActive(t: TenderFull): boolean {
  return (
    t.extraction_status === "running" ||
    t.matching_status === "running" ||
    t.drafting_status === "running" ||
    t.risks_status === "running"
  );
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
  const [tab, setTab] = useState<TabKey>("analysis");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Poll while pipeline active. Stops automatically when all stages settle.
  useEffect(() => {
    if (!pipelineActive(tender)) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
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
  }, [tender, refreshTender]);

  return (
    <div className="px-7 lg:px-9 py-6">
      <div className="space-y-6">
        <TenderHeader tender={tender} />
        <Tabs
          tabs={[
            { key: "analysis", label: "Analysis" },
            { key: "capabilities", label: "Capabilities" },
            { key: "export", label: "Export" },
          ]}
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
        />

        {tab === "analysis" ? (
          <AnalysisTab
            tender={tender}
            capabilities={capabilities}
            onTenderChange={setTender}
            onRefresh={refreshTender}
          />
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
  );
}
