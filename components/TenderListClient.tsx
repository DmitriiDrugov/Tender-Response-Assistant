"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import { UploadCard } from "./UploadCard";
import { StatusDot } from "./StatusDot";
import { formatDate, formatRelativeTime, daysUntil, pct } from "@/lib/utils";
import type { PipelineStatus } from "@/lib/types";
import { PipelineProgress, type PipelineState } from "./PipelineProgress";

type Coverage = {
  total: number;
  covered: number;
  partial: number;
  missing: number;
  unclear: number;
};

type TenderRow = PipelineState & {
  id: string;
  title: string;
  issuing_authority: string | null;
  submission_deadline: string | null;
  created_at: string;
  updated_at: string;
  coverage?: Coverage;
};

function isPipelineActive(t: TenderRow): boolean {
  return (
    t.extraction_status === "running" ||
    t.matching_status === "running" ||
    t.drafting_status === "running" ||
    t.risks_status === "running"
  );
}

function deadlineLabel(iso: string | null): { text: string; tone: "default" | "soon" | "overdue" } {
  if (!iso) return { text: "No deadline", tone: "default" };
  const days = daysUntil(iso);
  const base = formatDate(iso);
  if (days == null) return { text: base, tone: "default" };
  if (days < 0) return { text: `${base} · overdue`, tone: "overdue" };
  if (days <= 14) return { text: `${base} · ${days} d`, tone: "soon" };
  return { text: `${base} · ${days} d`, tone: "default" };
}

export function TenderListClient() {
  const [tenders, setTenders] = useState<TenderRow[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tenders", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { tenders: TenderRow[] };
      setTenders(data.tenders);
    } catch {
      /* ignore — polling will retry */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll while any pipeline is running
  useEffect(() => {
    const anyActive = (tenders ?? []).some(isPipelineActive);
    if (!anyActive) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (!pollRef.current) {
      pollRef.current = setInterval(() => {
        void load();
      }, 2000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [tenders, load]);

  const onUploaded = useCallback(
    async (id: string) => {
      setActiveId(id);
      await load();
      // Kick off the full pipeline. Fire-and-forget; polling reflects progress.
      void runPipeline(id, load);
    },
    [load],
  );

  const onDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this tender and all derived data?")) return;
      const res = await fetch(`/api/tenders/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    },
    [load],
  );

  return (
    <section className="space-y-7">
      <UploadCard onUploaded={onUploaded} />

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="label">Past tenders</h2>
          <span className="text-12 text-ink-muted tabular">
            {tenders ? `${tenders.length}` : ""}
          </span>
        </div>

        {tenders == null ? (
          <p className="text-14 text-ink-muted py-4">Loading.</p>
        ) : tenders.length === 0 ? (
          <p className="text-14 text-ink-muted py-4 max-w-reading">
            No tenders yet. Upload a PDF above to begin.
          </p>
        ) : (
          <ul className="border-t border-border">
            {tenders.map((t) => (
              <TenderRow
                key={t.id}
                tender={t}
                emphasised={t.id === activeId}
                onDelete={() => void onDelete(t.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CoverageBar({ c }: { c: Coverage }) {
  if (c.total === 0) return null;
  const seg = (n: number) => `${(n / c.total) * 100}%`;
  return (
    <div className="space-y-2">
      <div
        className="h-1.5 w-full border border-border flex overflow-hidden"
        role="img"
        aria-label={`Coverage: ${c.covered} covered, ${c.partial} partial, ${c.missing} missing, ${c.unclear} unclear of ${c.total}.`}
      >
        <span style={{ width: seg(c.covered), background: "var(--status-covered)" }} />
        <span style={{ width: seg(c.partial), background: "var(--status-partial)" }} />
        <span style={{ width: seg(c.missing), background: "var(--status-missing)" }} />
        <span style={{ width: seg(c.unclear), background: "var(--status-unclear)" }} />
      </div>
      <div className="flex items-center gap-5 text-12 text-ink-muted tabular">
        <Tally count={c.covered} status="fully_covered" label="covered" />
        <Tally count={c.partial} status="partially_covered" label="partial" />
        <Tally count={c.missing} status="not_covered" label="missing" />
        <Tally count={c.unclear} status="unclear" label="unclear" />
      </div>
    </div>
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
      <span className="tabular">{count}</span>
      <span>{label}</span>
    </span>
  );
}

function TenderRow({
  tender,
  emphasised,
  onDelete,
}: {
  tender: TenderRow;
  emphasised: boolean;
  onDelete: () => void;
}) {
  const dl = deadlineLabel(tender.submission_deadline);
  const active = isPipelineActive(tender);
  const coverage = tender.coverage;
  const pctCovered = coverage && coverage.total > 0 ? pct(coverage.covered, coverage.total) : null;

  return (
    <li
      className={[
        "border-b border-border py-5",
        emphasised ? "bg-surface-sunk -mx-5 px-5" : "",
      ].join(" ")}
    >
      <div className="grid gap-5 md:grid-cols-[1fr_auto_auto] md:items-start">
        <div className="min-w-0">
          <Link
            href={`/tenders/${tender.id}`}
            className="group inline-flex items-baseline gap-3 max-w-full"
          >
            <h3 className="font-serif text-20 text-ink leading-snug group-hover:text-accent transition-colors duration-160 ease-out truncate">
              {tender.title}
            </h3>
            <ChevronRight
              size={16}
              strokeWidth={1.5}
              className="text-ink-muted group-hover:text-accent transition-colors duration-160 ease-out shrink-0 mt-1.5"
              aria-hidden="true"
            />
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-13 text-ink-muted">
            {tender.issuing_authority ? <span>{tender.issuing_authority}</span> : null}
            <span
              className={
                dl.tone === "overdue"
                  ? "text-accent"
                  : dl.tone === "soon"
                    ? "text-status-partial"
                    : ""
              }
            >
              {dl.text}
            </span>
            <span>Updated {formatRelativeTime(tender.updated_at)}</span>
          </div>

          {active ? (
            <div className="mt-3">
              <PipelineProgress state={tender} />
            </div>
          ) : null}
        </div>

        <div className="md:min-w-[14rem]">
          {coverage && coverage.total > 0 ? (
            <CoverageBar c={coverage} />
          ) : (
            <p className="text-12 text-ink-muted">No coverage yet.</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {pctCovered != null ? (
            <div className="font-serif text-25 text-ink tabular leading-none">
              {pctCovered}
              <span className="text-14 text-ink-muted">%</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            className="btn btn-ghost btn-sm"
            aria-label={`Delete tender ${tender.title}`}
          >
            <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * Walks the full pipeline. Each step waits for the previous because matching
 * depends on extraction and drafting depends on matching. Risks run after
 * drafting completes but technically could run in parallel — keeping it serial
 * here to respect free-tier rate limits.
 */
async function runPipeline(id: string, refresh: () => Promise<void>) {
  try {
    await fetch(`/api/tenders/${id}/extract`, { method: "POST" });
    await refresh();
    await fetch(`/api/tenders/${id}/match`, { method: "POST" });
    await refresh();
    // Risks first (small, fast) then drafting (long-running)
    await fetch(`/api/tenders/${id}/risks`, { method: "POST" });
    await refresh();
    await fetch(`/api/tenders/${id}/draft`, { method: "POST" });
    await refresh();
  } catch {
    // Errors are reflected in tender status; polling will surface them
  }
}
