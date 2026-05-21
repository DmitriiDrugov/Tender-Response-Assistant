# Pipeline Parallelism — Design Spec

**Date:** 2026-05-21  
**Status:** Approved  

## Problem

On paid-tier models with 80–300 requirements, the analysis pipeline is too slow to be usable:

| Stage | Current behaviour | Root cause |
|-------|-------------------|------------|
| Draft | ~1800s for 300 reqs (or timeout at ~50) | Sequential loop + `DRAFT_PACING_MS=6000` default |
| Match | ~8× LLM latency for 300 reqs | Chunks processed in sequential `for` loop |
| Match DB write | ~300 sequential round-trips | One `UPDATE` per requirement, awaited inline |

## Goal

Reduce end-to-end pipeline time for a 300-requirement tender from **>30 minutes** to **under 2 minutes** on paid-tier models, without introducing new infrastructure or breaking existing error handling.

## Non-goals

- Background job queue / Supabase Edge Functions
- Changes to extract or risk routes (not the bottleneck)
- UI changes (progress tracking already works; no changes needed)
- Free-tier behaviour (env vars let operators restore conservative settings)

---

## Design

### 1. Parallel drafting — `draft/route.ts`

**Mechanism:** inline `Semaphore` class (~12 lines), no new file.

```typescript
class Semaphore {
  private count: number;
  private queue: (() => void)[] = [];
  constructor(n: number) { this.count = n; }
  acquire(): Promise<void> {
    return this.count > 0
      ? (this.count--, Promise.resolve())
      : new Promise<void>(r => this.queue.push(r));
  }
  release(): void {
    const next = this.queue.shift();
    next ? next() : this.count++;
  }
}
```

**Replacement for the `for` loop:**

```typescript
const CONCURRENCY = Math.max(1, Number(process.env.DRAFT_CONCURRENCY ?? "5"));
const sem = new Semaphore(CONCURRENCY);

await Promise.allSettled(
  pendingRequirements.map(async (r) => {
    await sem.acquire();
    try {
      // existing single-requirement draft logic, unchanged
      done++;
      await sb.from("tenders").update({ drafting_progress_done: done }).eq("id", id);
    } finally {
      sem.release();
    }
  })
);
```

**Notes:**
- `done++` is safe: JavaScript's event loop guarantees the increment is not interleaved.
- `Promise.allSettled` preserves partial-failure semantics: a failed requirement does not abort others. Per-requirement `draft_status: "failed"` is still set; user can regenerate individually.
- Progress updates are issued after each individual draft completes — real-time progress tracking is preserved.
- `DRAFT_PACING_MS` default changes from `6000` → `0`. Free-tier operators set it to `6000` explicitly.

**Expected throughput:** 300 reqs ÷ 5 concurrent × ~2s/req = **~120s**. At concurrency=10, ~60s.

---

### 2. Parallel matching chunks — `match/route.ts`

**Replacement for the sequential `for` loop:**

```typescript
const chunkResults = await Promise.all(
  chunks.map(async (chunkReqs, chunkIdx) => {
    if (!chunkReqs) return { chunkStart: chunkIdx * CHUNK_SIZE, output: [] };
    const chunkStart = chunkIdx * CHUNK_SIZE;
    const requirementsForPrompt = chunkReqs.map((r, localIdx) => ({
      index: localIdx,
      text: r.text,
      category: r.category,
      is_mandatory: r.is_mandatory,
    }));
    const output = await llmJSON({ ... });
    return { chunkStart, output };
  })
);

for (const { chunkStart, output } of chunkResults) {
  for (const item of output) {
    byIndex.set(chunkStart + item.requirement_index, item);
  }
}
```

**`Promise.all` (not `allSettled`):** fail-fast on any chunk failure. If one chunk's LLM call fails, the whole matching is marked failed and the user re-runs. This matches the existing error contract.

**Expected throughput:** 8 chunks in parallel ≈ **1× LLM call latency** (~5–10s) instead of 8× (~40–80s).

---

### 3. Batch DB writes in matching — `match/route.ts`

**Replacement for the sequential update loop:**

```typescript
const updateResults = await Promise.all(
  requirements.map((reqRow, i) => {
    if (!reqRow) return Promise.resolve({ error: null });
    const m = byIndex.get(i);
    if (!m) return Promise.resolve({ error: null });

    const matchedIds = m.matched_capability_names
      .map(n => capabilityByName.get(n.toLowerCase()))
      .filter((x): x is string => !!x);

    const payload: Record<string, unknown> = {
      matched_capability_ids: matchedIds,
      gap_description: m.gap_description,
      suggested_action: m.suggested_action,
      confidence: m.confidence,
    };
    if (!reqRow.overridden_by_user) {
      payload.match_status = m.match_status;
      payload.overridden_by_user = false;
    }
    return sb.from("requirements").update(payload).eq("id", reqRow.id);
  })
);

const failed = updateResults.filter(r => r.error).length;
const updated = requirements.length - failed;
```

**Expected throughput:** 300 sequential Supabase round-trips → **1 parallel batch** (~same wall time as 1–2 individual calls).

---

### 4. Configuration

**`.env.local.example` changes:**

```bash
# Pipeline tuning — defaults tuned for paid-tier models
DRAFT_PACING_MS=0          # ms between draft calls; set to 6000 for free-tier models
DRAFT_CONCURRENCY=5        # parallel draft workers; set to 1 for free-tier models
# MATCH_CHUNK_SIZE=40      # requirements per LLM call (default: 40)
```

---

## Error handling contract (unchanged)

| Stage | On failure | Behaviour |
|-------|-----------|-----------|
| Draft | Single requirement fails | `draft_status: "failed"` on that row; others continue; user regenerates individually |
| Draft | Rate limit | Entire drafting marked `failed`; user re-runs; already-completed rows skipped |
| Match | Any chunk fails | Entire matching marked `failed`; user re-runs |
| Match DB write | Any update fails | `matching_status: "failed"` with count |

## Files changed

| File | Change |
|------|--------|
| `app/api/tenders/[id]/draft/route.ts` | Add `Semaphore`; replace `for` loop with `Promise.allSettled`; change `DRAFT_PACING_MS` default to `0`; add `DRAFT_CONCURRENCY` |
| `app/api/tenders/[id]/match/route.ts` | Replace sequential chunk loop with `Promise.all`; replace sequential DB writes with parallel `Promise.all` |
| `.env.local.example` | Update `DRAFT_PACING_MS` default; add `DRAFT_CONCURRENCY` |

## No schema changes

No database migrations required.
