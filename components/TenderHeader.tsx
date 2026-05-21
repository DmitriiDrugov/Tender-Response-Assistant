"use client";

import Link from "next/link";
import type { TenderFull } from "@/lib/types";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";

export function TenderHeader({ tender }: { tender: TenderFull }) {
  const dl = tender.submission_deadline;
  const dDays = daysUntil(dl);
  const deadlineUrgent = dDays != null && dDays < 0;

  return (
    <div className="space-y-0">
      {/* Row 1: nav + title + actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="font-label-md text-label-md uppercase">Back to Tenders</span>
          </Link>
          <span className="text-outline-variant flex-shrink-0">/</span>
          <h2 className="font-headline-md text-headline-md text-primary truncate">
            {tender.title}
          </h2>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="relative hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search project data…"
              className="bg-surface-container-low industrial-border pl-9 pr-4 py-2 font-body-md text-on-surface w-56 focus:outline-none focus:ring-1 focus:ring-primary rounded-none placeholder:text-outline"
            />
          </div>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </div>

      {/* Row 2: metadata grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 industrial-border bg-surface-container-lowest divide-x divide-outline-variant mt-4">
        {tender.issuing_authority && (
          <MetaCell label="Authority" value={tender.issuing_authority} />
        )}
        {tender.tender_id_external && (
          <MetaCell label="Tender ID" value={tender.tender_id_external} mono />
        )}
        <div className="p-4">
          <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">
            Deadline
          </p>
          <p
            className={[
              "font-data-md text-data-md",
              deadlineUrgent ? "text-error font-bold italic" : "text-on-surface",
            ].join(" ")}
          >
            {formatDate(dl)}
            {dDays != null
              ? dDays < 0
                ? ` (${Math.abs(dDays)} days overdue)`
                : ` (${dDays} days left)`
              : ""}
          </p>
        </div>
        {tender.estimated_value_amount != null && (
          <MetaCell
            label="Estimated Value"
            value={formatCurrency(tender.estimated_value_amount, tender.estimated_value_currency)}
            mono
          />
        )}
      </div>
    </div>
  );
}

function MetaCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="p-4">
      <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">{label}</p>
      <p className={mono ? "font-data-md text-data-md text-on-surface" : "font-body-md text-body-md text-on-surface"}>
        {value}
      </p>
    </div>
  );
}
