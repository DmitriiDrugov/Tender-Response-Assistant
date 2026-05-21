"use client";

import { StatusDot } from "./StatusDot";

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

export function CoverageStats({ counts }: { counts: Counts }) {
  const total = counts.total;
  if (total === 0) {
    return (
      <div className="border-y border-border py-5">
        <p className="text-13 text-ink-muted">Coverage will appear here once matching completes.</p>
      </div>
    );
  }
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  const seg = (n: number) => ({ width: `${(n / total) * 100}%` });

  return (
    <section
      className="border-y border-border py-5 grid gap-5 lg:grid-cols-[1fr_auto] items-end"
      aria-label="Coverage summary"
    >
      <div className="space-y-3 min-w-0">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-25 leading-none tabular text-ink">
            {pct(counts.covered)}
          </span>
          <span className="label">fully covered</span>
          <span className="text-12 text-ink-muted tabular">
            {counts.covered} of {total}
          </span>
        </div>
        <div
          className="h-1.5 w-full border border-border flex overflow-hidden"
          role="img"
          aria-label={`Coverage: ${counts.covered} covered, ${counts.partial} partial, ${counts.missing} missing, ${counts.unclear} unclear.`}
        >
          <span style={{ ...seg(counts.covered), background: "var(--status-covered)" }} />
          <span style={{ ...seg(counts.partial), background: "var(--status-partial)" }} />
          <span style={{ ...seg(counts.missing), background: "var(--status-missing)" }} />
          <span style={{ ...seg(counts.unclear), background: "var(--status-unclear)" }} />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-12 text-ink-muted">
          <Tally count={counts.covered} status="fully_covered" label="covered" />
          <Tally count={counts.partial} status="partially_covered" label="partial" />
          <Tally count={counts.missing} status="not_covered" label="missing" />
          <Tally count={counts.unclear} status="unclear" label="unclear" />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-7 gap-y-2 text-13">
        <Metric label="Requirements" value={total.toString()} />
        <Metric label="Mandatory" value={counts.mandatory.toString()} />
        <Metric label="Missing on mandatory" value={counts.missing_mandatory.toString()} />
        <Metric label="Reviewed" value={`${counts.reviewed}/${total}`} />
      </dl>
    </section>
  );
}

function Tally({
  count,
  status,
  label,
}: {
  count: number;
  status: "fully_covered" | "partially_covered" | "not_covered" | "unclear";
  label: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <StatusDot status={status} />
      <span className="tabular text-ink">{count}</span>
      <span>{label}</span>
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="label">{label}</dt>
      <dd className="tabular text-ink text-14">{value}</dd>
    </div>
  );
}

