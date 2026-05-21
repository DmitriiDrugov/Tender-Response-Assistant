# Logs Viewer — Design Spec

**Date:** 2026-05-21  
**Status:** Approved  

## Problem

The app logs every LLM call to `request_logs` but never surfaces that data in the UI. Pipeline stage transitions (running → complete → failed) are not recorded at all. When something fails there is no way to inspect what happened without direct DB access.

## Goal

A `/logs` page that shows two filterable, paginated tables:

1. **LLM Requests** — every model call from `request_logs`
2. **Pipeline Events** — every pipeline stage transition from a new `pipeline_events` table

## Non-goals

- Charts, graphs, token-usage dashboards
- Per-tender embedded logs (separate feature if needed later)
- Log retention / archival policies
- Real-time streaming / auto-refresh

---

## Design

### 1. Data layer

#### New table `pipeline_events`

Migration: `supabase/migrations/0002_pipeline_events.sql`

```sql
create table pipeline_events (
  id          uuid        primary key default gen_random_uuid(),
  tender_id   uuid        references tenders(id) on delete cascade,
  stage       text        not null,  -- 'extract' | 'match' | 'draft' | 'risks'
  status      text        not null,  -- 'running' | 'complete' | 'failed'
  error       text,
  created_at  timestamptz not null default now()
);
create index pipeline_events_created_at_idx on pipeline_events(created_at desc);
create index pipeline_events_tender_id_idx  on pipeline_events(tender_id);
```

#### Helper `lib/pipeline-logger.ts`

Single insert function called from all four pipeline routes:

```typescript
export async function logPipelineEvent(
  tenderId: string,
  stage: "extract" | "match" | "draft" | "risks",
  status: "running" | "complete" | "failed",
  error?: string | null,
): Promise<void> {
  await supabaseServer()
    .from("pipeline_events")
    .insert({ tender_id: tenderId, stage, status, error: error ?? null });
}
```

Logging failures are silently swallowed (same pattern as `logRequest` in `lib/llm/client.ts`) — a log write must never fail the pipeline request.

#### Write points in pipeline routes

Each of the four routes (`extract`, `match`, `draft`, `risks`) calls `logPipelineEvent` alongside the existing `tenders.update` calls:

| Route | Events written |
|-------|---------------|
| extract | `running` at start; `complete` or `failed` at end |
| match | `running` at start; `complete` or `failed` at end |
| draft | `running` at start; `complete` or `failed` at end |
| risks | `running` at start; `complete` or `failed` at end |

---

### 2. API routes

All routes use `supabaseServer()` and are protected by the existing auth-cookie middleware. Page size is fixed at 50.

#### `GET /api/logs/llm`

Reads `request_logs` joined with `tenders(title)`.

Query parameters:

| Param | Values | Default |
|-------|--------|---------|
| `tender_id` | uuid | all |
| `status` | `ok` \| `error` \| `rate_limited` \| `parse_error` | all |
| `route` | `extract` \| `match` \| `draft` \| `risk` | all |
| `page` | integer ≥ 0 | `0` |

Response shape (Zod-validated):

```typescript
{
  rows: Array<{
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
  }>;
  total: number;
}
```

#### `GET /api/logs/pipeline`

Reads `pipeline_events` joined with `tenders(title)`.

Query parameters:

| Param | Values | Default |
|-------|--------|---------|
| `tender_id` | uuid | all |
| `stage` | `extract` \| `match` \| `draft` \| `risks` | all |
| `status` | `running` \| `complete` \| `failed` | all |
| `page` | integer ≥ 0 | `0` |

Response shape:

```typescript
{
  rows: Array<{
    id: string;
    created_at: string;
    tender_id: string | null;
    tender_title: string | null;
    stage: string;
    status: string;
    error: string | null;
  }>;
  total: number;
}
```

#### `GET /api/logs/tenders`

Returns `{ id, title }` for all tenders, ordered by `created_at desc`. No pagination. Used to populate the tender dropdown filter.

---

### 3. UI

#### `app/logs/page.tsx`

Server Component. Validates auth (same pattern as other pages), renders `<Shell>` wrapping `<LogsPageClient />`. No data fetching — all reads happen client-side via `fetch`.

#### `components/LogsPageClient.tsx`

`"use client"` component. Manages filter state and fetches data on mount and on filter change.

**State:**
```typescript
type Tab = "llm" | "pipeline";
type Filters = {
  tab: Tab;
  tenderId: string;   // "" = all
  status: string;     // "" = all
  routeOrStage: string; // "" = all
  page: number;
};
```

Filters reset `page` to `0` on any change.

**Layout:**

```
[LLM Requests]  [Pipeline Events]

Tender: [All ▾]   Status: [All ▾]   Route: [All ▾]
──────────────────────────────────────────────────
Time          Tender         Route   Model   In   Out   ms    Status
2026-05-21…   Budget 2026    match   deep…   4200  800  3210  ● ok
2026-05-21…   Budget 2026    draft   llama   320   850  1840  ● error
──────────────────────────────────────────────────
← Prev    Page 1 of 4    Next →
```

Pipeline Events tab replaces Model / In / Out / ms columns with Stage.

**Column details — LLM Requests:**

| Column | Content |
|--------|---------|
| Time | `created_at` formatted as `YYYY-MM-DD HH:mm:ss` in local time |
| Tender | Title linked to `/tenders/[id]`; "—" if null |
| Route | `extract` / `match` / `draft` / `risk` |
| Model | Model string, truncated at 24 chars |
| In | `input_tokens` or "—" |
| Out | `output_tokens` or "—" |
| ms | `duration_ms` |
| Status | Status dot (6px) + label. `ok` → `--status-complete`; `error` / `rate_limited` / `parse_error` → `--status-failed` |
| Error | First 60 chars; full text in `title` attribute |

**Column details — Pipeline Events:**

| Column | Content |
|--------|---------|
| Time | Same format |
| Tender | Same |
| Stage | `extract` / `match` / `draft` / `risks` |
| Status | Dot + label. `running` → `--status-running`; `complete` → `--status-complete`; `failed` → `--status-failed` |
| Error | First 60 chars; full text in `title` |

**Status dot:** uses existing `<StatusDot>` component (`components/StatusDot.tsx`) which already maps `complete`/`running`/`failed`/`pending` to design-system tokens.

**Filters:**
- Tender dropdown: options built from `/api/logs/tenders` response
- Status / Route dropdowns: static option lists (no API call needed)
- All selects use the existing `<select>` styling from DESIGN.md

#### Navigation — `components/Shell.tsx`

Add a **Logs** `<Link href="/logs">` between Capabilities and the logout button, using the same `label` class as existing nav links.

---

## Files created / modified

| File | Action |
|------|--------|
| `supabase/migrations/0002_pipeline_events.sql` | Create |
| `lib/pipeline-logger.ts` | Create |
| `app/api/logs/llm/route.ts` | Create |
| `app/api/logs/pipeline/route.ts` | Create |
| `app/api/logs/tenders/route.ts` | Create |
| `app/logs/page.tsx` | Create |
| `components/LogsPageClient.tsx` | Create |
| `app/api/tenders/[id]/extract/route.ts` | Modify — add `logPipelineEvent` calls |
| `app/api/tenders/[id]/match/route.ts` | Modify — add `logPipelineEvent` calls |
| `app/api/tenders/[id]/draft/route.ts` | Modify — add `logPipelineEvent` calls |
| `app/api/tenders/[id]/risks/route.ts` | Modify — add `logPipelineEvent` calls |
| `components/Shell.tsx` | Modify — add Logs nav link |

## No breaking changes

Existing pipeline routes are additive-only: `logPipelineEvent` is fire-and-forget, swallowed on error. No schema columns removed or renamed.
