"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DocumentStatus, Risk, TenderFull } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SidePanel({
  tender,
  onRefresh,
}: {
  tender: TenderFull;
  onRefresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(true);

  return (
    <aside
      className={cn(
        "lg:sticky lg:top-5 transition-[grid-template-rows] duration-320 ease-out",
        open ? "" : "lg:w-12",
      )}
      aria-label="Tender review panel"
    >
      <div className="border border-border bg-surface">
        <div className="flex items-stretch">
          {open ? (
            <div className="flex-1 px-5 py-4 border-r border-border">
              <h3 className="label">Review panel</h3>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse review panel" : "Expand review panel"}
            className="w-10 h-10 m-1 flex items-center justify-center text-ink-muted hover:text-ink"
          >
            {open ? (
              <ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <ChevronLeft size={14} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        </div>

        {open ? (
          <div className="p-5 space-y-7">
            <RisksSection risks={tender.risks} />
            <DocumentsSection
              tenderId={tender.id}
              docs={tender.required_documents}
              onRefresh={onRefresh}
            />
            <CriteriaSection criteria={tender.evaluation_criteria} />
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function RisksSection({ risks }: { risks: Risk[] }) {
  const ordered = [...risks].sort((a, b) => sevRank(a.severity) - sevRank(b.severity));
  return (
    <section aria-labelledby="risks-heading">
      <div className="flex items-center justify-between mb-3">
        <h4 id="risks-heading" className="font-serif text-20 text-ink leading-none">
          Risks
        </h4>
        <span className="text-12 text-ink-muted tabular">{risks.length}</span>
      </div>

      {risks.length === 0 ? (
        <p className="text-13 text-ink-muted">None identified.</p>
      ) : (
        <ul className="divide-y divide-border">
          {ordered.map((r) => (
            <li key={r.id} className="py-3 space-y-1.5">
              <div className="flex items-center gap-2 text-12 uppercase tracking-wider">
                <span
                  className="dot"
                  style={{ background: severityColor(r.severity) }}
                  aria-hidden="true"
                />
                <span style={{ color: severityColor(r.severity) }} className="font-medium">
                  {r.severity}
                </span>
                <span className="text-ink-muted normal-case tracking-normal">{r.category}</span>
              </div>
              <p className="text-13 text-ink leading-snug">{r.description}</p>
              {r.source_location ? (
                <p className="text-12 text-ink-muted font-mono">{r.source_location}</p>
              ) : null}
              {r.recommended_action ? (
                <p className="text-12 text-ink-2">
                  <span className="label mr-1">Action</span>
                  {r.recommended_action}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const DOC_STATUSES: DocumentStatus[] = ["missing", "uploaded", "needs_review", "approved"];

const STATUS_LABEL: Record<DocumentStatus, string> = {
  missing: "Missing",
  uploaded: "Uploaded",
  needs_review: "Needs review",
  approved: "Approved",
};

const STATUS_COLOR: Record<DocumentStatus, string> = {
  missing: "var(--status-missing)",
  uploaded: "var(--status-partial)",
  needs_review: "var(--status-unclear)",
  approved: "var(--status-covered)",
};

function DocumentsSection({
  tenderId,
  docs,
  onRefresh,
}: {
  tenderId: string;
  docs: TenderFull["required_documents"];
  onRefresh: () => Promise<void>;
}) {
  const prepared = docs.filter((d) => d.status === "uploaded" || d.status === "approved").length;
  const [error, setError] = useState<string | null>(null);

  async function handleStatusCycle(docId: string, status: DocumentStatus) {
    const next = DOC_STATUSES[(DOC_STATUSES.indexOf(status) + 1) % DOC_STATUSES.length];
    try {
      const res = await fetch(`/api/required-documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(d?.error || "Status update failed.");
        return;
      }
      setError(null);
      await onRefresh();
    } catch {
      setError("Network error.");
    }
  }

  return (
    <section aria-labelledby="docs-heading">
      <div className="mb-3 space-y-0.5">
        <div className="flex items-center justify-between">
          <h4 id="docs-heading" className="font-serif text-20 text-ink leading-none">
            Required documents
          </h4>
          <span className="text-12 text-ink-muted tabular">{docs.length} found</span>
        </div>
        {docs.length > 0 && (
          <p className="text-12 text-ink-muted">
            Prepared / uploaded:{" "}
            <span className="text-ink tabular">
              {prepared}/{docs.length}
            </span>
          </p>
        )}
      </div>

      {docs.length === 0 ? (
        <p className="text-13 text-ink-muted">No documents extracted.</p>
      ) : (
        <>
          {error ? (
            <p role="alert" className="text-12 text-accent mb-2">{error}</p>
          ) : null}
          <ul className="divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="py-2.5 flex items-start justify-between gap-3">
                <span className="text-13 text-ink leading-snug flex-1">{d.name}</span>
                <button
                  type="button"
                  onClick={() => void handleStatusCycle(d.id, d.status)}
                  className="flex-shrink-0 flex items-center gap-1.5 text-12 text-ink-muted hover:text-ink transition-colors duration-160"
                  title="Click to change status"
                >
                  <span
                    className="dot"
                    style={{ background: STATUS_COLOR[d.status] }}
                    aria-hidden="true"
                  />
                  {STATUS_LABEL[d.status]}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function CriteriaSection({ criteria }: { criteria: TenderFull["evaluation_criteria"] }) {
  const total = criteria.reduce((s, c) => s + (c.weight_percent ?? 0), 0);
  return (
    <section aria-labelledby="criteria-heading">
      <div className="flex items-center justify-between mb-3">
        <h4 id="criteria-heading" className="font-serif text-20 text-ink leading-none">
          Evaluation criteria
        </h4>
        {total > 0 ? (
          <span className="text-12 text-ink-muted tabular">{total}% weighted</span>
        ) : null}
      </div>

      {criteria.length === 0 ? (
        <p className="text-13 text-ink-muted">No criteria extracted.</p>
      ) : (
        <ul className="space-y-3">
          {criteria.map((c) => (
            <li key={c.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-13 text-ink leading-snug">{c.criterion}</span>
                {c.weight_percent != null ? (
                  <span className="font-serif text-16 tabular text-ink">{c.weight_percent}%</span>
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
      )}
    </section>
  );
}

function sevRank(s: Risk["severity"]): number {
  return s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;
}
function severityColor(s: Risk["severity"]): string {
  if (s === "critical") return "var(--severity-critical)";
  if (s === "high") return "var(--severity-high)";
  if (s === "medium") return "var(--severity-medium)";
  return "var(--severity-low)";
}
