"use client";

import type { TenderFull } from "@/lib/types";

type Blocker = { label: string; count: number };

function deriveBlockers(tender: TenderFull): Blocker[] {
  const blockers: Blocker[] = [];
  const missingDocs = tender.required_documents.filter(
    (d) => d.status === "missing" || d.status === "requested",
  ).length;
  if (missingDocs > 0)
    blockers.push({ label: `required ${missingDocs === 1 ? "document" : "documents"} missing or not started`, count: missingDocs });

  const activeHighRisks = tender.risks.filter(
    (r) => (r.severity === "critical" || r.severity === "high") && !r.is_false_positive && r.decision == null,
  ).length;
  if (activeHighRisks > 0)
    blockers.push({ label: `high or critical ${activeHighRisks === 1 ? "risk" : "risks"} without a decision`, count: activeHighRisks });

  const missingMandatory = tender.requirements.filter(
    (r) => r.is_mandatory && r.match_status === "not_covered",
  ).length;
  if (missingMandatory > 0)
    blockers.push({ label: `mandatory ${missingMandatory === 1 ? "requirement" : "requirements"} not covered`, count: missingMandatory });

  const unreviewed = tender.requirements.filter(
    (r) => !r.reviewed_at && r.draft_status === "ready",
  ).length;
  if (unreviewed > 0)
    blockers.push({ label: `draft ${unreviewed === 1 ? "response" : "responses"} pending review`, count: unreviewed });

  return blockers;
}

export function RedFlagBanner({
  tender,
  onViewBlockers,
}: {
  tender: TenderFull;
  onViewBlockers?: () => void;
}) {
  const blockers = deriveBlockers(tender);
  if (blockers.length === 0) return null;

  return (
    <div
      role="alert"
      aria-label="Submission blockers"
      className="heavy-border border-error bg-error-container/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
    >
      <div className="flex items-start gap-4">
        <div className="bg-error text-on-error p-2 flex-shrink-0">
          <span className="material-symbols-outlined">warning</span>
        </div>
        <div>
          <h3 className="font-headline-sm text-headline-sm text-error uppercase">
            Submission Not Ready
          </h3>
          <ul className="mt-2 space-y-1">
            {blockers.map((b) => (
              <li key={b.label} className="font-body-md text-body-md flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-error rounded-full flex-shrink-0" />
                <span className="font-data-md text-data-md text-error mr-1">{b.count}</span>
                {b.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {onViewBlockers && (
        <button
          type="button"
          onClick={onViewBlockers}
          className="bg-on-surface text-surface px-6 py-3 font-label-md text-label-md uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-2 flex-shrink-0"
        >
          View Blockers
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      )}
    </div>
  );
}
