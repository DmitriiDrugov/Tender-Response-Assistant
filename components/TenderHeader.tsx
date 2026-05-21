"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { TenderFull } from "@/lib/types";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { PipelineProgress } from "./PipelineProgress";

export function TenderHeader({ tender }: { tender: TenderFull }) {
  const dl = tender.submission_deadline;
  const dDays = daysUntil(dl);
  const deadlineTone =
    dDays == null ? "default" : dDays < 0 ? "overdue" : dDays <= 14 ? "soon" : "default";

  return (
    <header className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-13 text-ink-muted hover:text-ink transition-colors duration-160 ease-out"
      >
        <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
        All tenders
      </Link>

      <div className="space-y-3">
        <h1 className="font-serif text-31 leading-tight text-ink max-w-reading">
          {tender.title}
        </h1>
        <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2 text-13 text-ink-2">
          {tender.issuing_authority ? (
            <Field label="Issuer" value={tender.issuing_authority} />
          ) : null}
          {tender.tender_id_external ? (
            <Field label="Tender ID" value={tender.tender_id_external} mono />
          ) : null}
          {tender.country ? <Field label="Country" value={tender.country} /> : null}
          {tender.language ? <Field label="Language" value={tender.language} /> : null}
          {tender.estimated_value_amount != null ? (
            <Field
              label="Estimated value"
              value={formatCurrency(tender.estimated_value_amount, tender.estimated_value_currency)}
            />
          ) : null}
          {tender.contract_duration ? (
            <Field label="Duration" value={tender.contract_duration} />
          ) : null}
          <div className="flex items-baseline gap-2">
            <span className="label">Deadline</span>
            <span
              className={
                deadlineTone === "overdue"
                  ? "text-accent"
                  : deadlineTone === "soon"
                    ? "text-status-partial"
                    : "text-ink"
              }
            >
              {formatDate(dl)}
              {dDays != null
                ? dDays < 0
                  ? " · overdue"
                  : ` · in ${dDays} d`
                : null}
            </span>
          </div>
        </div>
      </div>

      <PipelineProgress
        state={{
          extraction_status: tender.extraction_status,
          matching_status: tender.matching_status,
          drafting_status: tender.drafting_status,
          risks_status: tender.risks_status,
          drafting_progress_done: tender.drafting_progress_done,
          drafting_progress_total: tender.drafting_progress_total,
          last_error: tender.last_error,
        }}
      />

      {tender.scope_summary ? (
        <p className="font-serif text-16 leading-relaxed text-ink-2 max-w-reading">
          {tender.scope_summary}
        </p>
      ) : null}
    </header>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="label">{label}</span>
      <span className={mono ? "font-mono text-13 text-ink" : "text-ink"}>{value}</span>
    </div>
  );
}
