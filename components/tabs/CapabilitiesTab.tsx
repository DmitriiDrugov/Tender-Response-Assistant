"use client";

import { useState } from "react";
import { RefreshCcw, Database } from "lucide-react";
import type { Capability } from "@/lib/types";
import { CapabilityMatrix } from "../CapabilityMatrix";

export function CapabilitiesTab({
  tenderId,
  capabilities,
  onCapabilitiesChange,
  onRefreshCapabilities,
  onRefreshTender,
}: {
  tenderId: string;
  capabilities: Capability[];
  onCapabilitiesChange: (cs: Capability[]) => void;
  onRefreshCapabilities: () => Promise<void>;
  onRefreshTender: () => Promise<void>;
}) {
  const [rematching, setRematching] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function rerunMatching() {
    setRematching(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/match`, { method: "POST" });
      if (res.ok) {
        await onRefreshTender();
        setMessage("Matching re-run complete.");
      } else {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setMessage(d?.error ?? "Re-run failed.");
      }
    } finally {
      setRematching(false);
    }
  }

  async function seedTemplate() {
    setSeeding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/capabilities", { method: "PUT" });
      if (res.ok) {
        const data = (await res.json()) as { inserted: number };
        await onRefreshCapabilities();
        setMessage(`Inserted ${data.inserted} starter ${data.inserted === 1 ? "capability" : "capabilities"}.`);
      } else {
        setMessage("Seed failed.");
      }
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-2">
        <div className="space-y-1 max-w-reading">
          <h2 className="font-serif text-25 text-ink leading-tight">Capability matrix</h2>
          <p className="text-13 text-ink-muted">
            Edits here apply globally. Re-run matching to apply changes against the current tender.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {capabilities.length === 0 ? (
            <button type="button" onClick={seedTemplate} disabled={seeding} className="btn btn-sm">
              <Database size={14} strokeWidth={1.5} aria-hidden="true" />
              {seeding ? "Seeding." : "Seed starter capabilities"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={rerunMatching}
            disabled={rematching}
            className="btn btn-primary btn-sm"
          >
            <RefreshCcw size={14} strokeWidth={1.5} aria-hidden="true" />
            {rematching ? "Re-running matching." : "Re-run matching"}
          </button>
        </div>
      </header>

      {message ? <p className="text-13 text-ink-muted">{message}</p> : null}

      <CapabilityMatrix capabilities={capabilities} onChange={onCapabilitiesChange} />
    </div>
  );
}
