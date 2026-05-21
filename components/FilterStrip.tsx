"use client";

import { Search } from "lucide-react";
import { StatusDot } from "./StatusDot";
import type { RequirementType } from "@/lib/types";

export type FilterKey =
  | "all"
  | "mandatory"
  | "optional"
  | "covered"
  | "partial"
  | "missing"
  | "unclear"
  | "blocked"
  | `type:${string}`;

type Counts = {
  total: number;
  covered: number;
  partial: number;
  missing: number;
  unclear: number;
  mandatory: number;
};

const REQUIREMENT_TYPES: RequirementType[] = [
  "Bid Compliance",
  "Operational Delivery",
  "Technical / IT",
  "Commercial",
  "Legal / Contractual",
  "Document Requirement",
  "Reporting / KPI",
  "User Management",
  "EHS / Safety",
  "Other",
];

// Business-friendly labels for match statuses shown in filter strip
export const STATUS_BUSINESS_LABEL: Record<string, string> = {
  fully_covered: "Ready for review",
  partially_covered: "Needs input",
  not_covered: "Gap",
  unclear: "Clarification needed",
};

export function FilterStrip({
  filter,
  onFilter,
  query,
  onQuery,
  counts,
  typeFilter,
  onTypeFilter,
}: {
  filter: FilterKey;
  onFilter: (f: FilterKey) => void;
  query: string;
  onQuery: (q: string) => void;
  counts: Counts;
  typeFilter?: RequirementType | null;
  onTypeFilter?: (t: RequirementType | null) => void;
}) {
  const items: Array<{
    key: FilterKey;
    label: string;
    count: number;
    status?: "fully_covered" | "partially_covered" | "not_covered" | "unclear";
  }> = [
    { key: "all", label: "All", count: counts.total },
    { key: "mandatory", label: "Mandatory", count: counts.mandatory },
    { key: "optional", label: "Optional", count: counts.total - counts.mandatory },
    { key: "covered", label: "Ready for review", count: counts.covered, status: "fully_covered" },
    { key: "partial", label: "Needs input", count: counts.partial, status: "partially_covered" },
    { key: "missing", label: "Gap", count: counts.missing, status: "not_covered" },
    { key: "unclear", label: "Clarification needed", count: counts.unclear, status: "unclear" },
  ];

  return (
    <div className="bg-surface-container-low border border-outline-variant px-5 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div role="tablist" aria-label="Filter requirements" className="flex flex-wrap items-center gap-1">
          {items.map((it) => {
            const isActive = filter === it.key;
            return (
              <button
                key={it.key}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => onFilter(it.key)}
                className={[
                  "inline-flex items-center gap-2 px-3 h-8 text-13 transition-colors duration-160 ease-out",
                  isActive
                    ? "bg-surface text-on-surface border border-outline"
                    : "border border-transparent text-on-surface-variant hover:text-on-surface",
                ].join(" ")}
              >
                {it.status ? <StatusDot status={it.status} /> : null}
                <span>{it.label}</span>
                <span className="text-12 tabular text-on-surface-variant">{it.count}</span>
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 min-w-[14rem] grow max-w-[22rem]">
          <Search size={14} strokeWidth={1.5} className="text-on-surface-variant shrink-0" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search requirements"
            className="w-full bg-transparent text-14 text-on-surface placeholder:text-outline outline-none"
            aria-label="Search requirements"
          />
        </label>
      </div>

      {onTypeFilter ? (
        <div className="flex flex-wrap items-center gap-1" aria-label="Filter by requirement type">
          <button
            type="button"
            onClick={() => onTypeFilter(null)}
            className={[
              "inline-flex items-center px-2.5 h-7 text-12 uppercase tracking-wider transition-colors duration-160",
              typeFilter == null
                ? "bg-surface border border-outline text-on-surface"
                : "border border-transparent text-on-surface-variant hover:text-on-surface",
            ].join(" ")}
          >
            All types
          </button>
          {REQUIREMENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTypeFilter(t)}
              className={[
                "inline-flex items-center px-2.5 h-7 text-12 uppercase tracking-wider transition-colors duration-160",
                typeFilter === t
                  ? "bg-surface border border-outline text-on-surface"
                  : "border border-transparent text-on-surface-variant hover:text-on-surface",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
