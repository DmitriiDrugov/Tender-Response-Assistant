import type { RequirementCounts, TenderFull } from "@/lib/types";
import { CoverageStats } from "../CoverageStats";

export function OverviewTab({
  tender,
  counts,
}: {
  tender: TenderFull;
  counts: RequirementCounts;
}) {
  const missingDocs = tender.required_documents.filter((d) => d.status === "missing").length;
  const criticalHighRisks = tender.risks.filter(
    (r) => r.severity === "critical" || r.severity === "high",
  ).length;
  const docsReady = tender.required_documents.filter(
    (d) => d.status === "uploaded" || d.status === "approved",
  ).length;
  const totalWeight = tender.evaluation_criteria.reduce(
    (s, c) => s + (c.weight_percent ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <CoverageStats counts={counts} />

      <section aria-label="Submission readiness">
        <h3 className="font-serif text-20 text-ink mb-4 leading-none">Submission readiness</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ReadinessStat
            label="Documents prepared"
            value={`${docsReady}/${tender.required_documents.length}`}
            alert={missingDocs > 0}
          />
          <ReadinessStat
            label="High / critical risks"
            value={String(criticalHighRisks)}
            alert={criticalHighRisks > 0}
          />
          <ReadinessStat
            label="Requirements reviewed"
            value={`${counts.reviewed}/${counts.total}`}
          />
          <ReadinessStat
            label="Missing mandatory"
            value={String(counts.missing_mandatory)}
            alert={counts.missing_mandatory > 0}
          />
        </div>
      </section>

      {tender.evaluation_criteria.length > 0 ? (
        <section aria-label="Evaluation criteria">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-20 text-ink leading-none">Evaluation criteria</h3>
            {totalWeight > 0 ? (
              <span className="text-12 text-ink-muted tabular">{totalWeight}% weighted</span>
            ) : null}
          </div>
          <ul className="space-y-3 border-t border-border pt-4">
            {tender.evaluation_criteria.map((c) => (
              <li key={c.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-5">
                  <span className="text-14 text-ink leading-snug">{c.criterion}</span>
                  {c.weight_percent != null ? (
                    <span className="font-serif text-16 tabular text-ink flex-shrink-0">
                      {c.weight_percent}%
                    </span>
                  ) : null}
                </div>
                {c.weight_percent != null ? (
                  <div className="h-1 bg-surface-2 overflow-hidden">
                    <span
                      className="block h-full bg-ink-2"
                      style={{ width: `${Math.min(100, c.weight_percent)}%` }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ReadinessStat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="border border-border p-4 space-y-1.5">
      <p className="label">{label}</p>
      <p
        className={[
          "font-serif text-25 tabular leading-none",
          alert ? "text-accent" : "text-ink",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
