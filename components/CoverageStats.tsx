"use client";

import { StatusDot } from "./StatusDot";
import type { RequirementCounts } from "@/lib/types";

export function CoverageStats({ counts }: { counts: RequirementCounts }) {
  const total = counts.total;
  if (total === 0) {
    return (
      <p className="font-body-md text-body-md text-on-surface-variant py-4">
        Coverage will appear here once matching completes.
      </p>
    );
  }

  return (
    <section
      className="grid grid-cols-2 md:grid-cols-4 industrial-border divide-x divide-outline-variant bg-surface-container-lowest"
      aria-label="Coverage summary"
    >
      <CoverageTile count={counts.covered} label="Fully Covered" color="#705d00" />
      <CoverageTile count={counts.partial} label="Partially" color="#e9c400" />
      <CoverageTile count={counts.missing} label="Not Covered" color="#ba1a1a" />
      <CoverageTile count={counts.unclear} label="Unclear" color="#7e775f" />
    </section>
  );
}

function CoverageTile({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="p-6 text-center">
      <div className="w-2 h-2 rounded-full mx-auto mb-3" style={{ background: color }} />
      <p className="font-headline-sm text-headline-sm text-on-surface">{count}</p>
      <p className="font-label-md text-label-md text-on-surface-variant uppercase">{label}</p>
    </div>
  );
}
