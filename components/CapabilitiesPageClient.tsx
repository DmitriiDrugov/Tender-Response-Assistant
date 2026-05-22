"use client";

import { useCallback, useState } from "react";
import { Database } from "lucide-react";
import type { Capability } from "@/lib/types";
import { CapabilityMatrix } from "./CapabilityMatrix";

export function CapabilitiesPageClient({ initial }: { initial: Capability[] }) {
  const [capabilities, setCapabilities] = useState(initial);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/capabilities", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { capabilities: Capability[] };
    setCapabilities(data.capabilities);
  }, []);

  async function seed() {
    setSeeding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/capabilities", { method: "PUT" });
      if (res.ok) {
        const data = (await res.json()) as { inserted: number };
        await reload();
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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2 max-w-reading">
          <h1 className="font-serif text-31 text-on-surface leading-tight">Capability Matrix</h1>
          <p className="text-14 text-on-surface-variant">
            Reusable company evidence used to match tender requirements.
          </p>
        </div>
        <button type="button" onClick={seed} disabled={seeding} className="industrial-border px-3 py-1.5 font-label-md text-label-md text-on-surface hover:bg-surface-variant transition-colors">
          <Database size={14} strokeWidth={1.5} aria-hidden="true" />
          {seeding ? "Seeding." : "Seed from template"}
        </button>
      </header>

      {message ? <p className="text-13 text-on-surface-variant">{message}</p> : null}

      <CapabilityMatrix capabilities={capabilities} onChange={setCapabilities} onAfterAnyChange={reload} />
    </div>
  );
}
