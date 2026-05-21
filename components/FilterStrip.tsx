"use client";

import { Search } from "lucide-react";
import { StatusDot } from "./StatusDot";

export type FilterKey =
  | "all"
  | "mandatory"
  | "optional"
  | "covered"
  | "partial"
  | "missing"
  | "unclear";

type Counts = {
  total: number;
  covered: number;
  partial: number;
  missing: number;
  unclear: number;
  mandatory: number;
};

export function FilterStrip({
  filter,
  onFilter,
  query,
  onQuery,
  counts,
}: {
  filter: FilterKey;
  onFilter: (f: FilterKey) => void;
  query: string;
  onQuery: (q: string) => void;
  counts: Counts;
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
    { key: "covered", label: "Covered", count: counts.covered, status: "fully_covered" },
    { key: "partial", label: "Partial", count: counts.partial, status: "partially_covered" },
    { key: "missing", label: "Missing", count: counts.missing, status: "not_covered" },
    { key: "unclear", label: "Unclear", count: counts.unclear, status: "unclear" },
  ];

  return (
    <div className="bg-surface-sunk border border-border px-5 py-3 flex flex-wrap items-center justify-between gap-5">
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
                  ? "bg-surface text-ink border border-border-strong"
                  : "border border-transparent text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {it.status ? <StatusDot status={it.status} /> : null}
              <span>{it.label}</span>
              <span className="text-12 tabular text-ink-muted">{it.count}</span>
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-2 min-w-[14rem] grow max-w-[22rem]">
        <Search size={14} strokeWidth={1.5} className="text-ink-muted shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search requirements"
          className="w-full bg-transparent text-14 text-ink placeholder:text-ink-faint outline-none"
          aria-label="Search requirements"
        />
      </label>
    </div>
  );
}
