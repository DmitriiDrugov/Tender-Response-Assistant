"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UploadCard } from "./UploadCard";
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
  if (days < 0) return { text: `${base} (Overdue)`, tone: "overdue" };
  if (days <= 14) return { text: `${base} (${days} d)`, tone: "soon" };
  return { text: `${base} (${days} d)`, tone: "default" };
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
    } catch { /* polling will retry */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const anyActive = (tenders ?? []).some(isPipelineActive);
    if (!anyActive) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (!pollRef.current) {
      pollRef.current = setInterval(() => { void load(); }, 2000);
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [tenders, load]);

  const onUploaded = useCallback(async (id: string) => {
    setActiveId(id);
    await load();
    void runPipeline(id, load);
  }, [load]);

  const onDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this tender and all derived data?")) return;
    const res = await fetch(`/api/tenders/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }, [load]);

  return (
    <div>
      <UploadCard onUploaded={onUploaded} />

      <section>
        <div className="flex items-end justify-between mb-6 border-b-2 border-on-surface pb-2">
          <div className="flex items-center gap-2">
            <span className="font-label-md text-label-md text-on-surface">PAST TENDERS</span>
            {tenders != null && (
              <span className="bg-on-surface text-surface px-2 py-0.5 font-label-mono text-label-mono">
                {tenders.length}
              </span>
            )}
          </div>
        </div>

        {tenders == null ? (
          <p className="font-body-md text-body-md text-on-surface-variant py-4">Loading.</p>
        ) : tenders.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant py-4 max-w-2xl">
            No tenders yet. Upload a PDF above to begin.
          </p>
        ) : (
          <div className="space-y-4">
            {tenders.map((t) => (
              <TenderRowCard
                key={t.id}
                tender={t}
                emphasised={t.id === activeId}
                onDelete={() => void onDelete(t.id)}
              />
            ))}
          </div>
        )}
      </section>

      {tenders && tenders.length > 0 && (
        <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-px bg-outline industrial-border">
          <StatCard label="Total Value Scanned" value="—" />
          <StatCard label="Drafting Efficiency" value="—" note="Avg time saved per response" />
          <StatCard label="Matrix Health" value="Active" note="Capability data loaded" />
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-surface-container p-6">
      <p className="font-label-mono text-[10px] uppercase mb-2 text-on-surface-variant/60">{label}</p>
      <p className="font-headline-md text-headline-md text-on-surface">{value}</p>
      {note && <p className="text-[10px] font-label-mono text-on-surface-variant/60 mt-2 uppercase">{note}</p>}
    </div>
  );
}

function CoverageBar({ c }: { c: Coverage }) {
  if (c.total === 0) return null;
  const seg = (n: number) => `${(n / c.total) * 100}%`;
  return (
    <div className="space-y-2">
      <p className="font-label-md text-label-md text-on-surface-variant">CAPABILITY COVERAGE</p>
      <div
        className="flex h-3 w-full industrial-border overflow-hidden"
        role="img"
        aria-label={`Coverage: ${c.covered} covered, ${c.partial} partial, ${c.missing} missing, ${c.unclear} unclear.`}
      >
        <span style={{ width: seg(c.covered), background: "#705d00" }} />
        <span style={{ width: seg(c.partial), background: "#e9c400" }} />
        <span style={{ width: seg(c.missing), background: "#e4e2e1" }} />
        <span style={{ width: seg(c.unclear), background: "#ba1a1a" }} />
      </div>
      <div className="flex justify-between font-label-mono text-[10px] text-on-surface-variant/60">
        <span>{c.covered} Covered</span>
        <span>{c.missing} Missing</span>
      </div>
    </div>
  );
}

function TenderRowCard({
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
  const pctCovered =
    coverage && coverage.total > 0 ? pct(coverage.covered, coverage.total) : null;

  return (
    <div
      className={[
        "industrial-border p-6 transition-colors",
        emphasised ? "bg-surface-container-lowest" : "bg-surface-container-low hover:bg-surface-container-lowest",
      ].join(" ")}
    >
      <div className="grid grid-cols-12 gap-6 items-center">
        {/* Col 1–5: Info */}
        <div className="col-span-5">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/tenders/${tender.id}`}
              className="font-headline-sm text-headline-sm text-primary hover:underline"
            >
              {tender.title}
            </Link>
            <span className="material-symbols-outlined text-sm text-on-surface-variant">
              arrow_outward
            </span>
          </div>
          <div className="space-y-1">
            {tender.issuing_authority && (
              <p className="font-label-mono text-label-mono text-on-surface-variant/70 uppercase">
                {tender.issuing_authority}
              </p>
            )}
            <div className="flex items-center gap-3">
              <p
                className={[
                  "font-label-mono text-label-mono uppercase",
                  dl.tone === "overdue"
                    ? "text-error font-bold"
                    : dl.tone === "soon"
                    ? "text-primary"
                    : "text-on-surface-variant/80",
                ].join(" ")}
              >
                Deadline: {dl.text}
              </p>
              <span className="w-1 h-1 bg-outline rounded-full" />
              <p className="font-label-mono text-label-mono text-on-surface-variant/60">
                Updated {formatRelativeTime(tender.updated_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Col 6–9: Coverage */}
        <div className="col-span-4">
          {coverage && coverage.total > 0 ? (
            <CoverageBar c={coverage} />
          ) : (
            <p className="font-label-mono text-label-mono text-on-surface-variant/60">
              No coverage yet.
            </p>
          )}
        </div>

        {/* Col 10–12: Score + Delete */}
        <div className="col-span-3 flex items-center justify-end gap-6">
          {pctCovered != null && (
            <div className="text-right">
              <p className="font-label-mono text-[10px] text-on-surface-variant/60">MATCH</p>
              <p className="font-headline-md text-headline-md text-on-surface leading-none">
                {pctCovered}%
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete tender ${tender.title}`}
            className="industrial-border p-2 text-on-surface-variant hover:bg-error hover:text-on-error transition-colors"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      {active && (
        <div className="mt-6 pt-4 border-t border-outline-variant/30">
          <PipelineProgress state={tender} />
        </div>
      )}
    </div>
  );
}

async function runPipeline(id: string, refresh: () => Promise<void>) {
  try {
    const extractRes = await fetch(`/api/tenders/${id}/extract`, { method: "POST" });
    await refresh();
    if (!extractRes.ok) return;
    const matchRes = await fetch(`/api/tenders/${id}/match`, { method: "POST" });
    await refresh();
    if (!matchRes.ok) return;
    const risksRes = await fetch(`/api/tenders/${id}/risks`, { method: "POST" });
    await refresh();
    if (!risksRes.ok) return;
    await fetch(`/api/tenders/${id}/draft`, { method: "POST" });
    await refresh();
  } catch { /* errors reflected in status */ }
}
