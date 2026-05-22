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
          <h2 className="font-serif text-25 text-on-surface leading-tight">Capability Matrix</h2>
          <p className="text-14 text-on-surface-variant">
            Reusable company evidence used to match tender requirements.
          </p>
          <p className="text-14 text-on-surface-variant">
            Re-run matching compares the current tender requirements against the saved capability matrix.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {capabilities.length === 0 ? (
            <button type="button" onClick={seedTemplate} disabled={seeding} className="industrial-border px-3 py-1.5 font-label-md text-label-md text-on-surface hover:bg-surface-variant transition-colors">
              <Database size={14} strokeWidth={1.5} aria-hidden="true" />
              {seeding ? "Seeding." : "Seed starter capabilities"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={rerunMatching}
            disabled={rematching}
            className="bg-primary text-on-primary px-4 py-2 font-label-md text-label-md hover:brightness-110 transition-all"
          >
            <RefreshCcw size={14} strokeWidth={1.5} aria-hidden="true" />
            {rematching ? "Re-running matching." : "Re-run matching"}
          </button>
        </div>
      </header>

      {message ? <p className="text-13 text-on-surface-variant">{message}</p> : null}

      <CapabilityMatrix capabilities={capabilities} onChange={onCapabilitiesChange} />
    </div>
  );
}
