"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const PAGE_SIZE = 50;

const LLM_STATUS_COLOR: Record<string, string> = {
  ok: "var(--status-covered)",
  error: "var(--status-missing)",
  rate_limited: "var(--status-missing)",
  parse_error: "var(--status-missing)",
};

const PIPELINE_STATUS_COLOR: Record<string, string> = {
  complete: "var(--status-covered)",
  running: "var(--status-partial)",
  failed: "var(--status-missing)",
};

type Tab = "llm" | "pipeline";

type LlmRow = {
  id: string;
  created_at: string;
  tender_id: string | null;
  tender_title: string | null;
  route: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  duration_ms: number | null;
  status: string;
  error: string | null;
};

type PipelineRow = {
  id: string;
  created_at: string;
  tender_id: string | null;
  tender_title: string | null;
  stage: string;
  status: string;
  error: string | null;
};

type TenderOption = { id: string; title: string };

function formatTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="dot"
      style={{ background: color }}
    />
  );
}

function TruncatedError({ text }: { text: string | null }) {
  if (!text) return <span className="text-outline">—</span>;
  const truncated = text.length > 60 ? text.slice(0, 60) + "…" : text;
  return <span title={text}>{truncated}</span>;
}

export function LogsPageClient() {
  const [tab, setTab] = useState<Tab>("llm");
  const [tenderId, setTenderId] = useState("");
  const [status, setStatus] = useState("");
  const [routeOrStage, setRouteOrStage] = useState("");
  const [page, setPage] = useState(0);

  const [tenders, setTenders] = useState<TenderOption[]>([]);
  const [llmRows, setLlmRows] = useState<LlmRow[]>([]);
  const [pipelineRows, setPipelineRows] = useState<PipelineRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/logs/tenders")
      .then((r) => r.json())
      .then((d: { tenders?: TenderOption[] }) => setTenders(d.tenders ?? []))
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (tenderId) params.set("tender_id", tenderId);
      if (status) params.set("status", status);

      if (tab === "llm") {
        if (routeOrStage) params.set("route", routeOrStage);
        const res = await fetch(`/api/logs/llm?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = (await res.json()) as { rows?: LlmRow[]; total?: number };
        setLlmRows(d.rows ?? []);
        setTotal(d.total ?? 0);
      } else {
        if (routeOrStage) params.set("stage", routeOrStage);
        const res = await fetch(`/api/logs/pipeline?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = (await res.json()) as { rows?: PipelineRow[]; total?: number };
        setPipelineRows(d.rows ?? []);
        setTotal(d.total ?? 0);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }, [tab, tenderId, status, routeOrStage, page]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function switchTab(next: Tab) {
    setTab(next);
    setStatus("");
    setRouteOrStage("");
    setPage(0);
  }

  function handleSelect(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(0);
    };
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-6 border-b border-outline-variant">
        {(["llm", "pipeline"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={[
              "text-14 pb-3 border-b-2 transition-colors duration-160 ease-out",
              tab === t
                ? "border-primary text-on-surface"
                : "border-transparent text-outline hover:text-on-surface",
            ].join(" ")}
          >
            {t === "llm" ? "LLM Requests" : "Pipeline Events"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-5 text-14 text-outline">
        <label className="flex items-center gap-2">
          Tender
          <select
            value={tenderId}
            onChange={handleSelect(setTenderId)}
            className="bg-transparent border border-outline-variant text-on-surface text-14 px-2 h-8 outline-none focus:border-primary transition-colors duration-160"
          >
            <option value="">All</option>
            {tenders.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          Status
          <select
            value={status}
            onChange={handleSelect(setStatus)}
            className="bg-transparent border border-outline-variant text-on-surface text-14 px-2 h-8 outline-none focus:border-primary transition-colors duration-160"
          >
            <option value="">All</option>
            {tab === "llm" ? (
              <>
                <option value="ok">ok</option>
                <option value="error">error</option>
                <option value="rate_limited">rate_limited</option>
                <option value="parse_error">parse_error</option>
              </>
            ) : (
              <>
                <option value="running">running</option>
                <option value="complete">complete</option>
                <option value="failed">failed</option>
              </>
            )}
          </select>
        </label>

        <label className="flex items-center gap-2">
          {tab === "llm" ? "Route" : "Stage"}
          <select
            value={routeOrStage}
            onChange={handleSelect(setRouteOrStage)}
            className="bg-transparent border border-outline-variant text-on-surface text-14 px-2 h-8 outline-none focus:border-primary transition-colors duration-160"
          >
            <option value="">All</option>
            <option value="extract">extract</option>
            <option value="match">match</option>
            <option value="draft">draft</option>
            <option value={tab === "llm" ? "risk" : "risks"}>
              {tab === "llm" ? "risk" : "risks"}
            </option>
          </select>
        </label>
      </div>

      {/* Table */}
      {fetchError ? (
        <p className="text-14" style={{ color: "var(--status-missing)" }}>
          {fetchError}
        </p>
      ) : (
        <div className="overflow-x-auto" style={{ opacity: loading ? 0.6 : 1 }}>
          <table className="w-full text-13">
            <thead>
              <tr className="border-b border-outline-variant text-left">
                <th className="pb-2 pr-5 font-normal text-12 text-outline">Time</th>
                <th className="pb-2 pr-5 font-normal text-12 text-outline">Tender</th>
                {tab === "llm" ? (
                  <>
                    <th className="pb-2 pr-5 font-normal text-12 text-outline">Route</th>
                    <th className="pb-2 pr-5 font-normal text-12 text-outline">Model</th>
                    <th className="pb-2 pr-5 font-normal text-12 text-outline text-right">In</th>
                    <th className="pb-2 pr-5 font-normal text-12 text-outline text-right">Out</th>
                    <th className="pb-2 pr-5 font-normal text-12 text-outline text-right">ms</th>
                  </>
                ) : (
                  <th className="pb-2 pr-5 font-normal text-12 text-outline">Stage</th>
                )}
                <th className="pb-2 pr-5 font-normal text-12 text-outline">Status</th>
                <th className="pb-2 font-normal text-12 text-outline">Error</th>
              </tr>
            </thead>
            <tbody>
              {tab === "llm"
                ? llmRows.map((row) => (
                    <tr key={row.id} className="border-b border-outline-variant">
                      <td className="py-2 pr-5 font-mono text-12 text-outline whitespace-nowrap">
                        {formatTime(row.created_at)}
                      </td>
                      <td className="py-2 pr-5 text-12">
                        {row.tender_id ? (
                          <Link
                            href={`/tenders/${row.tender_id}`}
                            className="text-primary hover:underline"
                          >
                            {row.tender_title ?? row.tender_id.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-outline">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-5 font-mono text-12">{row.route}</td>
                      <td
                        className="py-2 pr-5 font-mono text-12 max-w-[12rem] truncate"
                        title={row.model ?? undefined}
                      >
                        {row.model ?? "—"}
                      </td>
                      <td className="py-2 pr-5 text-12 text-right tabular-nums">
                        {row.input_tokens ?? "—"}
                      </td>
                      <td className="py-2 pr-5 text-12 text-right tabular-nums">
                        {row.output_tokens ?? "—"}
                      </td>
                      <td className="py-2 pr-5 text-12 text-right tabular-nums">
                        {row.duration_ms ?? "—"}
                      </td>
                      <td className="py-2 pr-5 text-12">
                        <span className="flex items-center gap-1.5">
                          <Dot color={LLM_STATUS_COLOR[row.status] ?? "#7e775f"} />
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2 text-12 text-outline">
                        <TruncatedError text={row.error} />
                      </td>
                    </tr>
                  ))
                : pipelineRows.map((row) => (
                    <tr key={row.id} className="border-b border-outline-variant">
                      <td className="py-2 pr-5 font-mono text-12 text-outline whitespace-nowrap">
                        {formatTime(row.created_at)}
                      </td>
                      <td className="py-2 pr-5 text-12">
                        {row.tender_id ? (
                          <Link
                            href={`/tenders/${row.tender_id}`}
                            className="text-primary hover:underline"
                          >
                            {row.tender_title ?? row.tender_id.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-outline">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-5 font-mono text-12">{row.stage}</td>
                      <td className="py-2 pr-5 text-12">
                        <span className="flex items-center gap-1.5">
                          <Dot
                            color={PIPELINE_STATUS_COLOR[row.status] ?? "#7e775f"}
                          />
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2 text-12 text-outline">
                        <TruncatedError text={row.error} />
                      </td>
                    </tr>
                  ))}
              {!loading && tab === "llm" && llmRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-14 text-outline">
                    No log entries found.
                  </td>
                </tr>
              )}
              {!loading && tab === "pipeline" && pipelineRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-14 text-outline">
                    No pipeline events found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-5 text-14 text-outline">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="label hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-160 ease-out"
          >
            ← Prev
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="label hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-160 ease-out"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
