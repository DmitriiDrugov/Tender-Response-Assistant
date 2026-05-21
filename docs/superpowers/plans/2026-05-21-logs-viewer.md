# Logs Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/logs` page that shows filterable, paginated LLM request logs and pipeline event logs so operators can inspect what the app is doing under the hood.

**Architecture:** New `pipeline_events` Supabase table stores stage transitions written by a fire-and-forget `logPipelineEvent` helper called from all four pipeline routes. Three new API routes serve filtered/paginated data. A single `LogsPageClient` client component renders two switchable tables with dropdown filters and pagination.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase (PostgREST joins), Zod validation on all API inputs, `useEffect`/`useCallback` for client-side fetching.

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/0002_pipeline_events.sql` | Create — table + indexes |
| `lib/pipeline-logger.ts` | Create — `logPipelineEvent` helper |
| `app/api/tenders/[id]/extract/route.ts` | Modify — add 3 `logPipelineEvent` calls |
| `app/api/tenders/[id]/match/route.ts` | Modify — add 3 `logPipelineEvent` calls |
| `app/api/tenders/[id]/draft/route.ts` | Modify — add 3 `logPipelineEvent` calls |
| `app/api/tenders/[id]/risks/route.ts` | Modify — add 3 `logPipelineEvent` calls |
| `app/api/logs/tenders/route.ts` | Create — `GET /api/logs/tenders` |
| `app/api/logs/llm/route.ts` | Create — `GET /api/logs/llm` |
| `app/api/logs/pipeline/route.ts` | Create — `GET /api/logs/pipeline` |
| `app/logs/page.tsx` | Create — Server Component shell |
| `components/LogsPageClient.tsx` | Create — tabs, filters, tables, pagination |
| `components/Shell.tsx` | Modify — add Logs nav link |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/0002_pipeline_events.sql`

- [ ] **Step 1: Write the migration file**

  Create `supabase/migrations/0002_pipeline_events.sql` with:

  ```sql
  create table pipeline_events (
    id          uuid        primary key default gen_random_uuid(),
    tender_id   uuid        references tenders(id) on delete cascade,
    stage       text        not null,
    status      text        not null,
    error       text,
    created_at  timestamptz not null default now()
  );
  create index pipeline_events_created_at_idx on pipeline_events(created_at desc);
  create index pipeline_events_tender_id_idx  on pipeline_events(tender_id);
  ```

- [ ] **Step 2: Apply the migration**

  Using the Supabase MCP tool:
  ```
  mcp__supabase__apply_migration
    name: "create_pipeline_events"
    query: <contents of the SQL file above>
  ```

  Or via Supabase CLI if available:
  ```bash
  supabase db push
  ```

  Verify: the `pipeline_events` table appears in the database with the three columns (stage, status, error) and two indexes.

- [ ] **Step 3: Commit**

  ```bash
  git add supabase/migrations/0002_pipeline_events.sql
  git commit -m "add pipeline_events table migration"
  ```

---

## Task 2: Pipeline logger helper

**Files:**
- Create: `lib/pipeline-logger.ts`

- [ ] **Step 1: Create the file**

  ```typescript
  import { supabaseServer } from "@/lib/supabase/server";

  export async function logPipelineEvent(
    tenderId: string,
    stage: "extract" | "match" | "draft" | "risks",
    status: "running" | "complete" | "failed",
    error?: string | null,
  ): Promise<void> {
    try {
      await supabaseServer()
        .from("pipeline_events")
        .insert({ tender_id: tenderId, stage, status, error: error ?? null });
    } catch {
      // Logging must never fail the pipeline request.
    }
  }
  ```

- [ ] **Step 2: Verify typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add lib/pipeline-logger.ts
  git commit -m "add logPipelineEvent helper"
  ```

---

## Task 3: Instrument extract and risks routes

**Files:**
- Modify: `app/api/tenders/[id]/extract/route.ts`
- Modify: `app/api/tenders/[id]/risks/route.ts`

Each route gets three calls: `running` at the start, `complete` on success, `failed` in the catch block.

- [ ] **Step 1: Add import to extract/route.ts**

  At the top of `app/api/tenders/[id]/extract/route.ts`, after the existing imports, add:

  ```typescript
  import { logPipelineEvent } from "@/lib/pipeline-logger";
  ```

- [ ] **Step 2: Add running event to extract**

  Find the line:
  ```typescript
    await sb.from("tenders").update({ extraction_status: "running", last_error: null }).eq("id", id);
  ```
  Add immediately after:
  ```typescript
    await logPipelineEvent(id, "extract", "running");
  ```

- [ ] **Step 3: Add complete event to extract**

  Find the comment `// Single atomic update: status + optional truncation warning`. The `await sb.from("tenders").update({ extraction_status: "complete", ... }).eq("id", id);` block follows it. Add after the closing `.eq("id", id);` of that update:

  ```typescript
    await logPipelineEvent(id, "extract", "complete");
  ```

- [ ] **Step 4: Add failed event to extract catch block**

  In the `catch (err)` block, find:
  ```typescript
    await sb
      .from("tenders")
      .update({ extraction_status: "failed", last_error: message })
      .eq("id", id);
    return NextResponse.json({ error: message }, { status: httpStatus });
  ```
  Add between the update and the return:
  ```typescript
    await logPipelineEvent(id, "extract", "failed", message);
  ```

- [ ] **Step 5: Add import to risks/route.ts**

  At the top of `app/api/tenders/[id]/risks/route.ts`, after the existing imports, add:

  ```typescript
  import { logPipelineEvent } from "@/lib/pipeline-logger";
  ```

- [ ] **Step 6: Add running event to risks**

  Find:
  ```typescript
    await sb.from("tenders").update({ risks_status: "running", last_error: null }).eq("id", id);
  ```
  Add immediately after:
  ```typescript
    await logPipelineEvent(id, "risks", "running");
  ```

- [ ] **Step 7: Add complete event to risks**

  Find:
  ```typescript
    await sb.from("tenders").update({ risks_status: "complete" }).eq("id", id);
    return NextResponse.json({ ok: true, count: output.length });
  ```
  Add between the update and the return:
  ```typescript
    await logPipelineEvent(id, "risks", "complete");
  ```

- [ ] **Step 8: Add failed event to risks catch block**

  In the `catch (err)` block of risks/route.ts, find:
  ```typescript
    await sb
      .from("tenders")
      .update({ risks_status: "failed", last_error: message })
      .eq("id", id);
    return NextResponse.json({ error: message }, { status: httpStatus });
  ```
  Add between the update and the return:
  ```typescript
    await logPipelineEvent(id, "risks", "failed", message);
  ```

- [ ] **Step 9: Verify typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 10: Commit**

  ```bash
  git add app/api/tenders/\[id\]/extract/route.ts app/api/tenders/\[id\]/risks/route.ts
  git commit -m "instrument extract and risks routes with pipeline events"
  ```

---

## Task 4: Instrument match and draft routes

**Files:**
- Modify: `app/api/tenders/[id]/match/route.ts`
- Modify: `app/api/tenders/[id]/draft/route.ts`

- [ ] **Step 1: Add import to match/route.ts**

  ```typescript
  import { logPipelineEvent } from "@/lib/pipeline-logger";
  ```

- [ ] **Step 2: Add running event to match**

  Find:
  ```typescript
    await sb.from("tenders").update({ matching_status: "running", last_error: null }).eq("id", id);
  ```
  Add immediately after:
  ```typescript
    await logPipelineEvent(id, "match", "running");
  ```

- [ ] **Step 3: Add complete event to match**

  Find the `await sb.from("tenders").update({ matching_status: "complete", ... }).eq("id", id);` block (the final successful update, after the `if (failed > 0)` check). Add after its closing `.eq("id", id);`:

  ```typescript
    await logPipelineEvent(id, "match", "complete");
  ```

- [ ] **Step 4: Add failed event to match catch block**

  In the `catch (err)` block, find:
  ```typescript
    await sb
      .from("tenders")
      .update({ matching_status: "failed", last_error: message })
      .eq("id", id);
    return NextResponse.json({ error: message }, { status: httpStatus });
  ```
  Add between the update and the return:
  ```typescript
    await logPipelineEvent(id, "match", "failed", message);
  ```

- [ ] **Step 5: Add import to draft/route.ts**

  ```typescript
  import { logPipelineEvent } from "@/lib/pipeline-logger";
  ```

- [ ] **Step 6: Add running event to draft**

  Find the block that sets `drafting_status: "running"`:
  ```typescript
    await sb
      .from("tenders")
      .update({
        drafting_status: "running",
        drafting_progress_total: requirements.length,
        drafting_progress_done: alreadyDone,
        last_error: null,
      })
      .eq("id", id);
  ```
  Add immediately after the closing `.eq("id", id);`:
  ```typescript
    await logPipelineEvent(id, "draft", "running");
  ```

- [ ] **Step 7: Add failed event to draft abort path**

  Find the abort block that sets `drafting_status: "failed"`:
  ```typescript
    if (aborted && abortState.error) {
      await sb
        .from("tenders")
        .update({
          drafting_status: "failed",
          last_error: "Free-tier rate limit reached during drafting...",
          drafting_progress_done: done,
        })
        .eq("id", id);
      return NextResponse.json({ error: abortState.error.message }, { status: 429 });
    }
  ```
  Add between the tenders update and the return:
  ```typescript
      await logPipelineEvent(id, "draft", "failed", abortState.error.message);
  ```

- [ ] **Step 8: Add complete event to draft**

  Find the final update:
  ```typescript
    await sb
      .from("tenders")
      .update({
        drafting_status: "complete",
        drafting_progress_done: done,
        last_error: lastError,
      })
      .eq("id", id);

    return NextResponse.json({ ok: true, drafts: done, total: requirements.length });
  ```
  Add between the tenders update and the return:
  ```typescript
    await logPipelineEvent(id, "draft", "complete");
  ```

- [ ] **Step 9: Verify typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 10: Commit**

  ```bash
  git add app/api/tenders/\[id\]/match/route.ts app/api/tenders/\[id\]/draft/route.ts
  git commit -m "instrument match and draft routes with pipeline events"
  ```

---

## Task 5: API route — GET /api/logs/tenders

**Files:**
- Create: `app/api/logs/tenders/route.ts`

- [ ] **Step 1: Create the file**

  ```typescript
  import { NextResponse } from "next/server";
  import { supabaseServer } from "@/lib/supabase/server";

  export const runtime = "nodejs";

  export async function GET() {
    const sb = supabaseServer();
    const res = await sb
      .from("tenders")
      .select("id, title")
      .order("created_at", { ascending: false });
    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    }
    return NextResponse.json({ tenders: res.data ?? [] });
  }
  ```

- [ ] **Step 2: Verify typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/api/logs/tenders/route.ts
  git commit -m "add GET /api/logs/tenders route"
  ```

---

## Task 6: API route — GET /api/logs/llm

**Files:**
- Create: `app/api/logs/llm/route.ts`

The `request_logs` table has a foreign key to `tenders(id)`. Supabase PostgREST resolves `tenders(title)` in the select string as a left join. The result shape is `{ ..., tenders: { title: string } | null }` — flatten it before returning.

- [ ] **Step 1: Create the file**

  ```typescript
  import { NextResponse } from "next/server";
  import { z } from "zod";
  import { supabaseServer } from "@/lib/supabase/server";

  export const runtime = "nodejs";

  const PAGE_SIZE = 50;

  const querySchema = z.object({
    tender_id: z.string().uuid().optional(),
    status: z.enum(["ok", "error", "rate_limited", "parse_error"]).optional(),
    route: z.enum(["extract", "match", "draft", "risk"]).optional(),
    page: z.coerce.number().int().min(0).default(0),
  });

  export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { tender_id, status, route, page } = parsed.data;

    const sb = supabaseServer();
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = sb
      .from("request_logs")
      .select(
        "id, created_at, tender_id, route, model, input_tokens, output_tokens, duration_ms, status, error, tenders(title)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (tender_id) query = query.eq("tender_id", tender_id);
    if (status) query = query.eq("status", status);
    if (route) query = query.eq("route", route);

    const res = await query;
    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    }

    const rows = (res.data ?? []).map((r) => {
      const { tenders: tRow, ...rest } = r as typeof r & { tenders: { title: string } | null };
      return { ...rest, tender_title: tRow?.title ?? null };
    });

    return NextResponse.json({ rows, total: res.count ?? 0 });
  }
  ```

- [ ] **Step 2: Verify typecheck**

  ```bash
  npm run typecheck
  ```

  If TypeScript complains about the destructuring of `tenders` from the Supabase result (Supabase infers a complex union), add a type assertion on the map callback parameter:

  ```typescript
    const rows = (res.data ?? []).map((r) => {
      const tRow = (r as unknown as { tenders: { title: string } | null }).tenders;
      const { tenders: _drop, ...rest } = r as Record<string, unknown>;
      return { ...rest, tender_title: tRow?.title ?? null };
    });
  ```

  Expected final result: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/api/logs/llm/route.ts
  git commit -m "add GET /api/logs/llm route"
  ```

---

## Task 7: API route — GET /api/logs/pipeline

**Files:**
- Create: `app/api/logs/pipeline/route.ts`

Same join pattern as Task 6, but against `pipeline_events`.

- [ ] **Step 1: Create the file**

  ```typescript
  import { NextResponse } from "next/server";
  import { z } from "zod";
  import { supabaseServer } from "@/lib/supabase/server";

  export const runtime = "nodejs";

  const PAGE_SIZE = 50;

  const querySchema = z.object({
    tender_id: z.string().uuid().optional(),
    stage: z.enum(["extract", "match", "draft", "risks"]).optional(),
    status: z.enum(["running", "complete", "failed"]).optional(),
    page: z.coerce.number().int().min(0).default(0),
  });

  export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { tender_id, stage, status, page } = parsed.data;

    const sb = supabaseServer();
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = sb
      .from("pipeline_events")
      .select(
        "id, created_at, tender_id, stage, status, error, tenders(title)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (tender_id) query = query.eq("tender_id", tender_id);
    if (stage) query = query.eq("stage", stage);
    if (status) query = query.eq("status", status);

    const res = await query;
    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    }

    const rows = (res.data ?? []).map((r) => {
      const tRow = (r as unknown as { tenders: { title: string } | null }).tenders;
      const { tenders: _drop, ...rest } = r as Record<string, unknown>;
      return { ...rest, tender_title: tRow?.title ?? null };
    });

    return NextResponse.json({ rows, total: res.count ?? 0 });
  }
  ```

- [ ] **Step 2: Verify typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/api/logs/pipeline/route.ts
  git commit -m "add GET /api/logs/pipeline route"
  ```

---

## Task 8: Logs page and Shell nav link

**Files:**
- Create: `app/logs/page.tsx`
- Modify: `components/Shell.tsx`

- [ ] **Step 1: Create app/logs/page.tsx**

  ```typescript
  import { Shell } from "@/components/Shell";
  import { LogsPageClient } from "@/components/LogsPageClient";
  import { headers } from "next/headers";

  export const dynamic = "force-dynamic";

  export default async function LogsPage() {
    void headers();
    return (
      <Shell>
        <div className="px-7 lg:px-9 py-7">
          <div className="max-w-[68rem] mx-auto space-y-7">
            <header>
              <h1 className="font-serif text-31 text-ink leading-tight">Logs</h1>
            </header>
            <LogsPageClient />
          </div>
        </div>
      </Shell>
    );
  }
  ```

- [ ] **Step 2: Add Logs nav link to Shell.tsx**

  In `components/Shell.tsx`, find:
  ```tsx
            <Link
              href="/capabilities"
              className="label hover:text-ink transition-colors duration-160 ease-out"
            >
              Capabilities
            </Link>
            <LogoutButton />
  ```

  Replace with:
  ```tsx
            <Link
              href="/capabilities"
              className="label hover:text-ink transition-colors duration-160 ease-out"
            >
              Capabilities
            </Link>
            <Link
              href="/logs"
              className="label hover:text-ink transition-colors duration-160 ease-out"
            >
              Logs
            </Link>
            <LogoutButton />
  ```

- [ ] **Step 3: Verify typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  git add app/logs/page.tsx components/Shell.tsx
  git commit -m "add /logs page and nav link"
  ```

---

## Task 9: LogsPageClient component

**Files:**
- Create: `components/LogsPageClient.tsx`

This is the main UI component. It fetches data client-side via `fetch`, manages filter state, and renders two switchable tables.

Color mapping for status dots uses CSS custom properties from the design system:
- LLM `ok` → `var(--status-covered)` (green)
- LLM `error` / `rate_limited` / `parse_error` → `var(--status-missing)` (red)
- Pipeline `complete` → `var(--status-covered)`
- Pipeline `running` → `var(--status-partial)` (yellow)
- Pipeline `failed` → `var(--status-missing)`

- [ ] **Step 1: Create components/LogsPageClient.tsx**

  ```typescript
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
    if (!text) return <span className="text-ink-muted">—</span>;
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
        <div className="flex gap-6 border-b border-border">
          {(["llm", "pipeline"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={[
                "text-14 pb-3 border-b-2 transition-colors duration-160 ease-out",
                tab === t
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {t === "llm" ? "LLM Requests" : "Pipeline Events"}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-5 text-14 text-ink-muted">
          <label className="flex items-center gap-2">
            Tender
            <select
              value={tenderId}
              onChange={handleSelect(setTenderId)}
              className="bg-transparent border border-border text-ink text-14 px-2 h-8 outline-none focus:border-accent transition-colors duration-160"
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
              className="bg-transparent border border-border text-ink text-14 px-2 h-8 outline-none focus:border-accent transition-colors duration-160"
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
              className="bg-transparent border border-border text-ink text-14 px-2 h-8 outline-none focus:border-accent transition-colors duration-160"
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
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-5 font-normal text-12 text-ink-muted">Time</th>
                  <th className="pb-2 pr-5 font-normal text-12 text-ink-muted">Tender</th>
                  {tab === "llm" ? (
                    <>
                      <th className="pb-2 pr-5 font-normal text-12 text-ink-muted">Route</th>
                      <th className="pb-2 pr-5 font-normal text-12 text-ink-muted">Model</th>
                      <th className="pb-2 pr-5 font-normal text-12 text-ink-muted text-right">In</th>
                      <th className="pb-2 pr-5 font-normal text-12 text-ink-muted text-right">Out</th>
                      <th className="pb-2 pr-5 font-normal text-12 text-ink-muted text-right">ms</th>
                    </>
                  ) : (
                    <th className="pb-2 pr-5 font-normal text-12 text-ink-muted">Stage</th>
                  )}
                  <th className="pb-2 pr-5 font-normal text-12 text-ink-muted">Status</th>
                  <th className="pb-2 font-normal text-12 text-ink-muted">Error</th>
                </tr>
              </thead>
              <tbody>
                {tab === "llm"
                  ? llmRows.map((row) => (
                      <tr key={row.id} className="border-b border-border">
                        <td className="py-2 pr-5 font-mono text-12 text-ink-muted whitespace-nowrap">
                          {formatTime(row.created_at)}
                        </td>
                        <td className="py-2 pr-5 text-12">
                          {row.tender_id ? (
                            <Link
                              href={`/tenders/${row.tender_id}`}
                              className="text-accent hover:underline"
                            >
                              {row.tender_title ?? row.tender_id.slice(0, 8)}
                            </Link>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-5 font-mono text-12">{row.route}</td>
                        <td
                          className="py-2 pr-5 font-mono text-12 max-w-[12rem] truncate"
                          title={row.model ?? undefined}
                        >
                          {row.model ?? "—"}
                        </td>
                        <td className="py-2 pr-5 text-12 text-right tabular">
                          {row.input_tokens ?? "—"}
                        </td>
                        <td className="py-2 pr-5 text-12 text-right tabular">
                          {row.output_tokens ?? "—"}
                        </td>
                        <td className="py-2 pr-5 text-12 text-right tabular">
                          {row.duration_ms ?? "—"}
                        </td>
                        <td className="py-2 pr-5 text-12">
                          <span className="flex items-center gap-1.5">
                            <Dot
                              color={LLM_STATUS_COLOR[row.status] ?? "var(--ink-faint)"}
                            />
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2 text-12 text-ink-muted">
                          <TruncatedError text={row.error} />
                        </td>
                      </tr>
                    ))
                  : pipelineRows.map((row) => (
                      <tr key={row.id} className="border-b border-border">
                        <td className="py-2 pr-5 font-mono text-12 text-ink-muted whitespace-nowrap">
                          {formatTime(row.created_at)}
                        </td>
                        <td className="py-2 pr-5 text-12">
                          {row.tender_id ? (
                            <Link
                              href={`/tenders/${row.tender_id}`}
                              className="text-accent hover:underline"
                            >
                              {row.tender_title ?? row.tender_id.slice(0, 8)}
                            </Link>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-5 font-mono text-12">{row.stage}</td>
                        <td className="py-2 pr-5 text-12">
                          <span className="flex items-center gap-1.5">
                            <Dot
                              color={
                                PIPELINE_STATUS_COLOR[row.status] ?? "var(--ink-faint)"
                              }
                            />
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2 text-12 text-ink-muted">
                          <TruncatedError text={row.error} />
                        </td>
                      </tr>
                    ))}
                {!loading && tab === "llm" && llmRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-8 text-center text-14 text-ink-muted"
                    >
                      No log entries found.
                    </td>
                  </tr>
                )}
                {!loading && tab === "pipeline" && pipelineRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-14 text-ink-muted"
                    >
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
          <div className="flex items-center gap-5 text-14 text-ink-muted">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="label hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-160 ease-out"
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
              className="label hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-160 ease-out"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors. If the `as` cast in the API routes causes Supabase type inference issues here, note that the client component only types the response shape — no Supabase types are used client-side.

- [ ] **Step 3: Commit**

  ```bash
  git add components/LogsPageClient.tsx
  git commit -m "add LogsPageClient with tabs, filters, and pagination"
  ```

---

## Self-review

**Spec coverage:**
- ✅ `pipeline_events` table (Task 1)
- ✅ `logPipelineEvent` helper — fire-and-forget, never fails requests (Task 2)
- ✅ All 4 routes instrumented: running + complete + failed (Tasks 3–4)
- ✅ `GET /api/logs/tenders` for dropdown (Task 5)
- ✅ `GET /api/logs/llm` with tender_id / status / route / page filters (Task 6)
- ✅ `GET /api/logs/pipeline` with tender_id / stage / status / page filters (Task 7)
- ✅ `/logs` page Server Component (Task 8)
- ✅ Shell nav Logs link (Task 8)
- ✅ `LogsPageClient` — tabs, filters, tables, pagination, status dots, tender links, error truncation (Task 9)

**Type consistency:**
- `LlmRow` / `PipelineRow` / `TenderOption` defined in Task 9 and used only in Task 9 ✅
- `logPipelineEvent(id, stage, status, error?)` — signature in Task 2, call sites in Tasks 3–4 ✅
- Route/stage option values in selects match the Zod enums in API routes: LLM route uses `"risk"`, pipeline uses `"risks"` — correct, matches existing codebase convention ✅

**Placeholder scan:** No TBDs. TypeScript fallback in Task 6 Step 2 is a documented contingency, not a placeholder. ✅
