import type { RequirementCounts, TenderFull } from "@/lib/types";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { CoverageStats } from "../CoverageStats";

type BidRecommendation = "Strong Bid" | "Conditional Bid" | "High Risk Bid" | "No-Bid Recommended";

type BidReadiness = {
  recommendation: BidRecommendation;
  score: number;
  reasons: string[];
};

function computeBidReadiness(tender: TenderFull, counts: RequirementCounts): BidReadiness {
  const reasons: string[] = [];
  let penalty = 0;

  const missingMandatory = counts.missing_mandatory;
  if (missingMandatory > 0) {
    penalty += missingMandatory * 15;
    reasons.push(`${missingMandatory} mandatory requirement${missingMandatory > 1 ? "s" : ""} not covered`);
  } else {
    reasons.push("No missing mandatory requirements");
  }

  const missingDocs = tender.required_documents.filter(
    (d) => d.status === "missing" || d.status === "requested",
  ).length;
  if (missingDocs > 0) {
    penalty += missingDocs * 6;
    reasons.push(`${missingDocs} required ${missingDocs === 1 ? "document" : "documents"} not prepared`);
  }

  const activeHighRisks = tender.risks.filter(
    (r) => (r.severity === "critical" || r.severity === "high") && !r.is_false_positive && !r.decision,
  ).length;
  if (activeHighRisks > 0) {
    penalty += activeHighRisks * 10;
    reasons.push(`${activeHighRisks} high or critical ${activeHighRisks === 1 ? "risk" : "risks"} without a decision`);
  }

  const pendingClarifications = tender.clarification_questions.filter(
    (q) => q.status === "draft" || q.status === "approved",
  ).length;
  if (pendingClarifications > 0) {
    penalty += pendingClarifications * 4;
    reasons.push(`${pendingClarifications} clarification ${pendingClarifications === 1 ? "question" : "questions"} pending`);
  }

  if (counts.unclear > 0) {
    penalty += counts.unclear * 3;
    reasons.push(`${counts.unclear} unclear ${counts.unclear === 1 ? "requirement" : "requirements"}`);
  }

  const score = Math.max(0, Math.min(100, 100 - penalty));

  let recommendation: BidRecommendation;
  if (missingMandatory >= 3 || score < 30) recommendation = "No-Bid Recommended";
  else if (activeHighRisks > 0 && score < 55) recommendation = "High Risk Bid";
  else if (score < 70 || missingDocs > 2 || missingMandatory > 0) recommendation = "Conditional Bid";
  else recommendation = "Strong Bid";

  return { recommendation, score, reasons };
}

function bidRecommendationColor(r: BidRecommendation): string {
  if (r === "Strong Bid") return "#705d00";
  if (r === "Conditional Bid") return "#e9c400";
  if (r === "High Risk Bid") return "#93000a";
  return "#ba1a1a";
}

function computeSubmissionCompleteness(tender: TenderFull, counts: RequirementCounts): {
  score: number;
  components: { label: string; value: string; blocking: boolean }[];
} {
  const components = [];
  let total = 0;
  let achieved = 0;

  // Required documents approved/prepared
  const totalDocs = tender.required_documents.length;
  const preparedDocs = tender.required_documents.filter(
    (d) => d.status === "uploaded" || d.status === "prepared" || d.status === "approved",
  ).length;
  total += totalDocs > 0 ? 1 : 0;
  achieved += totalDocs > 0 && preparedDocs === totalDocs ? 1 : 0;
  if (totalDocs > 0)
    components.push({
      label: "Required documents prepared",
      value: `${preparedDocs}/${totalDocs}`,
      blocking: preparedDocs < totalDocs,
    });

  // Mandatory requirements reviewed
  const mandatoryReqs = tender.requirements.filter((r) => r.is_mandatory);
  const reviewedMandatory = mandatoryReqs.filter((r) => r.reviewed_at).length;
  total += mandatoryReqs.length > 0 ? 1 : 0;
  achieved += mandatoryReqs.length === 0 || reviewedMandatory === mandatoryReqs.length ? 1 : 0;
  if (mandatoryReqs.length > 0)
    components.push({
      label: "Mandatory requirements reviewed",
      value: `${reviewedMandatory}/${mandatoryReqs.length}`,
      blocking: reviewedMandatory < mandatoryReqs.length,
    });

  // Draft responses reviewed
  const readyDrafts = tender.requirements.filter((r) => r.draft_status === "ready").length;
  const reviewedDrafts = tender.requirements.filter((r) => r.draft_status === "ready" && r.reviewed_at).length;
  total += readyDrafts > 0 ? 1 : 0;
  achieved += readyDrafts === 0 || reviewedDrafts === readyDrafts ? 1 : 0;
  if (readyDrafts > 0)
    components.push({
      label: "Draft responses reviewed",
      value: `${reviewedDrafts}/${readyDrafts}`,
      blocking: reviewedDrafts < readyDrafts,
    });

  // Open high risks without decision
  const openHighRisks = tender.risks.filter(
    (r) => (r.severity === "critical" || r.severity === "high") && !r.is_false_positive && !r.decision,
  ).length;
  total += 1;
  achieved += openHighRisks === 0 ? 1 : 0;
  components.push({
    label: "High / critical risks with decision",
    value: openHighRisks === 0 ? "None open" : `${openHighRisks} open`,
    blocking: openHighRisks > 0,
  });

  // Missing mandatory requirements
  total += 1;
  achieved += counts.missing_mandatory === 0 ? 1 : 0;
  components.push({
    label: "Missing mandatory requirements",
    value: counts.missing_mandatory === 0 ? "None" : String(counts.missing_mandatory),
    blocking: counts.missing_mandatory > 0,
  });

  // Clarifications pending
  const pendingClarifications = tender.clarification_questions.filter(
    (q) => q.status === "draft" || q.status === "approved",
  ).length;
  total += 1;
  achieved += pendingClarifications === 0 ? 1 : 0;
  components.push({
    label: "Clarification questions pending",
    value: pendingClarifications === 0 ? "None" : String(pendingClarifications),
    blocking: pendingClarifications > 0,
  });

  const score = total > 0 ? Math.round((achieved / total) * 100) : 100;
  return { score, components };
}

export function OverviewTab({
  tender,
  counts,
}: {
  tender: TenderFull;
  counts: RequirementCounts;
}) {
  const bidReadiness = computeBidReadiness(tender, counts);
  const completeness = computeSubmissionCompleteness(tender, counts);

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Left column */}
      <div className="col-span-12 lg:col-span-8 space-y-8">
        {/* Bid Recommendation */}
        <div className="grid grid-cols-1 md:grid-cols-2 industrial-border bg-surface-container-lowest overflow-hidden">
          <div className="p-8 border-b md:border-b-0 md:border-r border-outline-variant bg-surface-container-low/30">
            <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-4">
              Strategic Assessment
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <h3
                className="font-headline-lg text-headline-lg"
                style={{ color: bidRecommendationColor(bidReadiness.recommendation) }}
              >
                {bidReadiness.recommendation}
              </h3>
              <span className="font-data-md text-data-md bg-primary-container text-on-primary-container px-2 py-1">
                SCORE: {bidReadiness.score}%
              </span>
            </div>
            <div className="space-y-3 mt-4">
              <p className="font-label-md text-label-md text-on-surface font-bold uppercase">
                Decision Drivers
              </p>
              {bidReadiness.reasons.map((r) => (
                <div key={r} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    {r.startsWith("No missing") ? "check_circle" : "cancel"}
                  </span>
                  <span className="font-body-md text-body-md">{r}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Donut chart */}
          <div className="p-8 flex flex-col justify-center items-center bg-surface-container-lowest">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e4e2e1" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="transparent"
                  stroke="#705d00"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - bidReadiness.score / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-headline-lg text-headline-lg">{bidReadiness.score}%</span>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase">
                  Readiness
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Coverage tiles */}
        <CoverageStats counts={counts} />

        {/* Evaluation criteria */}
        {tender.evaluation_criteria.length > 0 && (
          <div className="industrial-border bg-surface-container-lowest">
            <div className="p-4 border-b border-outline-variant bg-on-surface text-surface">
              <h4 className="font-label-md text-label-md uppercase tracking-widest">
                Weighting &amp; Evaluation Matrix
              </h4>
            </div>
            <div className="divide-y divide-outline-variant">
              {tender.evaluation_criteria.map((c) => (
                <div key={c.id} className="p-6 space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="font-body-md text-body-md font-bold">{c.criterion}</span>
                    {c.weight_percent != null && (
                      <span className="font-data-md text-data-md">{c.weight_percent}% WEIGHT</span>
                    )}
                  </div>
                  {c.weight_percent != null && (
                    <div className="w-full h-3 bg-secondary-container">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, c.weight_percent)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="col-span-12 lg:col-span-4 space-y-8">
        {/* Submission completeness */}
        <div className="industrial-border bg-surface-container-high/50">
          <div className="p-6 border-b border-outline-variant bg-surface-container-lowest">
            <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-4">
              Submission Progress
            </p>
            <div className="flex items-center gap-4 mb-2">
              <h3 className="font-headline-md text-headline-md">{completeness.score}%</h3>
              <div className="flex-1 h-2 bg-secondary-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${completeness.score}%` }}
                />
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {completeness.components.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between p-3 bg-surface-container-lowest industrial-border"
              >
                <span
                  className={[
                    "font-body-md text-body-md",
                    c.blocking ? "text-error" : "",
                  ].join(" ")}
                >
                  {c.label}
                </span>
                <span
                  className={[
                    "font-data-md text-data-md",
                    c.blocking ? "text-error font-bold" : "text-primary",
                  ].join(" ")}
                >
                  {c.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        {(tender.publication_date || tender.clarification_deadline || tender.submission_deadline) && (
          <div className="industrial-border bg-surface-container-lowest">
            <div className="p-4 border-b border-outline-variant">
              <h4 className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
                Critical Deadlines
              </h4>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant">
                  <th className="p-3 border-b border-outline-variant font-label-md text-[10px] uppercase">
                    Milestone
                  </th>
                  <th className="p-3 border-b border-outline-variant font-label-md text-[10px] uppercase text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="font-data-md text-data-md divide-y divide-outline-variant">
                {tender.publication_date && (
                  <TimelineRow label="Publication" date={tender.publication_date} />
                )}
                {tender.clarification_deadline && (
                  <TimelineRow label="Clarifications Due" date={tender.clarification_deadline} warn />
                )}
                {tender.internal_review_deadline && (
                  <TimelineRow label="Internal Review" date={tender.internal_review_deadline} warn />
                )}
                {tender.final_approval_deadline && (
                  <TimelineRow label="Final Approval" date={tender.final_approval_deadline} warn />
                )}
                {tender.submission_deadline && (
                  <TimelineRow label="Submission" date={tender.submission_deadline} warn />
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineRow({ label, date, warn = false }: { label: string; date: string; warn?: boolean }) {
  const days = daysUntil(date);
  const tone =
    warn && days != null
      ? days < 0 ? "overdue" : days <= 7 ? "soon" : "default"
      : "default";

  return (
    <tr className="hover:bg-surface-container-low transition-colors">
      <td className="p-3">
        <p className="font-bold">{label}</p>
        <p className="text-on-surface-variant text-[11px]">{formatDate(date)}</p>
      </td>
      <td className="p-3 text-right">
        {tone === "overdue" ? (
          <span className="bg-error text-on-error px-2 py-0.5 font-label-md">OVERDUE</span>
        ) : days != null ? (
          <span className={tone === "soon" ? "text-primary font-bold" : "text-on-surface-variant"}>
            In {days} days
          </span>
        ) : (
          <span className="text-on-surface-variant">—</span>
        )}
      </td>
    </tr>
  );
}

