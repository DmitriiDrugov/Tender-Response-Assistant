# Pipeline Parallelism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sequential draft and match loops with parallel execution so a 300-requirement tender completes the full pipeline in under 2 minutes on paid-tier models.

**Architecture:** Three targeted edits to two route files — a Semaphore-gated `Promise.allSettled` replaces the serial draft loop; a `Promise.all` over chunks replaces the serial match loop; a second `Promise.all` replaces the serial matching DB-write loop. No new files, no schema changes.

**Tech Stack:** Next.js 15 App Router API routes, TypeScript strict, Supabase client, `@/lib/llm/client` (`llmJSON`), `@/lib/llm/schemas` (`matchWrappedSchema`, `MatchOutput`).

---

## File Map

| File | Change |
|------|--------|
| `app/api/tenders/[id]/draft/route.ts` | Add `Semaphore` class; replace serial `for` loop with `Promise.allSettled`; remove unused `sleep`; change `DRAFT_PACING_MS` default to `"0"`; add `DRAFT_CONCURRENCY` |
| `app/api/tenders/[id]/match/route.ts` | Replace serial chunk `for` loop with `Promise.all`; replace serial DB-write `for` loop with `Promise.all` |
| `.env.local.example` | Update pipeline tuning comments to reflect new defaults and new `DRAFT_CONCURRENCY` var |

---

## Task 1: Parallel drafting — `draft/route.ts`

**Files:**
- Modify: `app/api/tenders/[id]/draft/route.ts`

The file currently processes one requirement at a time with a 6-second sleep between each. Three things change:

1. `DRAFT_PACING_MS` default changes from `"6000"` to `"0"` — the sleep was a free-tier rate-limit workaround.
2. New `DRAFT_CONCURRENCY` constant controls how many LLM calls run simultaneously.
3. The serial `for` loop is replaced with a `Promise.allSettled` over a `Semaphore`-gated async map.

**Rate-limit abort signal:** because tasks run in parallel we can't `return NextResponse.json(...)` from inside a task. Instead, a shared `aborted` flag is checked at the top of each task (bail out before acquiring the semaphore) and after the `Promise.allSettled` completes (send the 429 response once).

---

- [ ] **Step 1: Replace pacing constant, add concurrency constant and Semaphore**

  Open `app/api/tenders/[id]/draft/route.ts`.

  Find and replace this block (lines 14–19):

  ```typescript
  // Delay between requirements. Set DRAFT_PACING_MS=0 on paid-tier models.
  const PACING_MS = Number(process.env.DRAFT_PACING_MS ?? "6000");

  // A 'running' tender whose updated_at is older than this is considered stale
  ```

  Replace with:

  ```typescript
  const PACING_MS = Number(process.env.DRAFT_PACING_MS ?? "0");
  const CONCURRENCY = Math.max(1, Number(process.env.DRAFT_CONCURRENCY ?? "5"));

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

  // A 'running' tender whose updated_at is older than this is considered stale
  ```

---

- [ ] **Step 2: Replace the serial `for` loop with `Promise.allSettled`**

  In the same file, find the block that starts with:

  ```typescript
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    let done = alreadyDone;
    let lastError: string | null = null;

    for (const r of requirements) {
  ```

  and ends at (just before the final `await sb.from("tenders").update`):

  ```typescript
      if (PACING_MS > 0) await sleep(PACING_MS);
    }
  ```

  Replace the entire block (from `const sleep` through the closing `}` of the for-loop) with:

  ```typescript
    const sleep = PACING_MS > 0
      ? (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
      : null;

    let done = alreadyDone;
    let lastError: string | null = null;
    let aborted = false;
    let abortError: RateLimitedError | null = null;

    const pendingRequirements = requirements.filter(
      (r): r is NonNullable<typeof r> =>
        !!r && r.draft_status !== "ready" && r.draft_status !== "blocked",
    );

    const sem = new Semaphore(CONCURRENCY);

    await Promise.allSettled(
      pendingRequirements.map(async (r) => {
        if (aborted) return;
        await sem.acquire();
        if (aborted) { sem.release(); return; }
        try {
          const matchedCapabilities = ((r.matched_capability_ids || []) as string[])
            .map((cid) => capById.get(cid))
            .filter((c): c is (typeof capabilities)[number] => !!c);
          const matchedNames = matchedCapabilities.map((c) => c.name);
          const evidenceText = JSON.stringify(
            matchedCapabilities.map((c) => ({
              category: c.category,
              name: c.name,
              description: c.description,
              evidence: c.evidence,
            })),
            null,
            2,
          );

          const requirementAndMatch = {
            text: r.text,
            category: r.category,
            is_mandatory: r.is_mandatory,
            source_excerpt: r.source_excerpt,
            match_status: r.match_status,
            matched_capability_names: matchedNames,
            gap_description: r.gap_description,
            suggested_action: r.suggested_action,
            confidence: r.confidence,
          };

          await sb
            .from("requirements")
            .update({ draft_status: "generating" })
            .eq("id", r.id);

          try {
            const output = await llmJSON({
              promptFile: "draft",
              variables: {
                REQUIREMENT_AND_MATCH_JSON: JSON.stringify(requirementAndMatch, null, 2),
                COMPANY_EVIDENCE: evidenceText,
              },
              model,
              schema: draftSchema,
              route: "draft",
              tenderId: id,
            });
            const guarded = enforceEvidenceBoundDraft({
              output,
              matchStatus: normalizeMatchStatus(r.match_status),
              isMandatory: r.is_mandatory,
              gapDescription: r.gap_description,
              matchedEvidence: matchedCapabilities,
            });

            await sb
              .from("requirements")
              .update({
                draft_response: guarded.draft_response,
                reviewer_notes: guarded.reviewer_notes,
                draft_status: guarded.requires_bid_manager_decision ? "blocked" : "ready",
              })
              .eq("id", r.id);

            done++;
            await sb
              .from("tenders")
              .update({ drafting_progress_done: done })
              .eq("id", id);
          } catch (err) {
            if (err instanceof RateLimitedError) {
              aborted = true;
              abortError = err;
              await sb
                .from("requirements")
                .update({ draft_status: "failed" })
                .eq("id", r.id);
              return;
            }
            lastError =
              err instanceof LlmJSONParseError
                ? "Model returned an unparseable response."
                : (err as Error).message;
            await sb
              .from("requirements")
              .update({ draft_status: "failed" })
              .eq("id", r.id);
          }

          if (sleep) await sleep(PACING_MS);
        } finally {
          sem.release();
        }
      }),
    );

    if (aborted && abortError) {
      await sb
        .from("tenders")
        .update({
          drafting_status: "failed",
          last_error:
            "Free-tier rate limit reached during drafting. Re-run drafting to resume where it stopped.",
          drafting_progress_done: done,
        })
        .eq("id", id);
      return NextResponse.json({ error: abortError.message }, { status: 429 });
    }
  ```

---

- [ ] **Step 3: Verify typecheck passes**

  ```bash
  npm run typecheck
  ```

  Expected: no errors. If TypeScript complains about `typeof capabilities[number]`, use the explicit type `(typeof capsRes.data)[number]` or cast — but with strict mode and the existing types it should resolve cleanly.

---

- [ ] **Step 4: Commit**

  ```bash
  git add app/api/tenders/\[id\]/draft/route.ts
  git commit -m "parallelize draft loop with semaphore-gated Promise.allSettled"
  ```

---

## Task 2: Parallel matching — `match/route.ts`

**Files:**
- Modify: `app/api/tenders/[id]/match/route.ts`

Two serial loops in this file are parallelised:

1. **Chunk loop** (lines ~90–119): each chunk is one LLM call; currently awaited sequentially; replaced with `Promise.all` (fail-fast — any chunk failure aborts the whole match, matching existing behaviour).
2. **DB write loop** (lines ~143–178): one `UPDATE` per requirement awaited sequentially; replaced with `Promise.all` over all updates.

---

- [ ] **Step 5: Replace the serial chunk loop with `Promise.all`**

  Open `app/api/tenders/[id]/match/route.ts`.

  Find the `try {` block that wraps the chunk loop (begins with `try {` and contains `for (let chunkIdx = 0; ...)`). Replace the entire try/catch block contents — keeping the `catch (err)` handler intact — with:

  ```typescript
  try {
    const chunkResults = await Promise.all(
      chunks.map(async (chunkReqs, chunkIdx) => {
        if (!chunkReqs) return { chunkStart: chunkIdx * CHUNK_SIZE, items: [] as MatchOutput };
        const chunkStart = chunkIdx * CHUNK_SIZE;
        const requirementsForPrompt = chunkReqs.map((r, localIdx) => ({
          index: localIdx,
          text: r.text,
          category: r.category,
          is_mandatory: r.is_mandatory,
        }));
        const output = await llmJSON({
          promptFile: "match",
          variables: {
            REQUIREMENTS_JSON: JSON.stringify(requirementsForPrompt, null, 2),
            CAPABILITY_MATRIX_JSON: JSON.stringify(capabilitiesForPrompt, null, 2),
          },
          model,
          schema: matchWrappedSchema,
          route: "match",
          tenderId: id,
        });
        return { chunkStart, items: output };
      }),
    );

    for (const { chunkStart, items } of chunkResults) {
      for (const item of items) {
        byIndex.set(chunkStart + item.requirement_index, item);
      }
    }
  } catch (err) {
  ```

  The `catch (err)` block and everything after it remains unchanged.

  > `MatchOutput` is already imported from `@/lib/llm/schemas` at the top of the file.

---

- [ ] **Step 6: Replace the serial DB write loop with `Promise.all`**

  In the same file, find the comment `// Write results.` and the sequential `for` loop below it (ends with `let updated = 0; let failed = 0;` and individual `await sb...update()` calls). Replace from `// Write results.` through the closing `}` of that for-loop with:

  ```typescript
  // Write results. Requirements where overridden_by_user === true keep their
  // existing match_status; all other fields (capabilities, gap, confidence) update.
  const updateResults = await Promise.all(
    requirements.map((reqRow, i) => {
      if (!reqRow) return Promise.resolve({ error: null });
      const m = byIndex.get(i);
      if (!m) return Promise.resolve({ error: null });

      const matchedIds = m.matched_capability_names
        .map((n) => capabilityByName.get(n.toLowerCase()))
        .filter((x): x is string => !!x);

      const updatePayload: Record<string, unknown> = {
        matched_capability_ids: matchedIds,
        gap_description: m.gap_description,
        suggested_action: m.suggested_action,
        confidence: m.confidence,
      };

      if (!reqRow.overridden_by_user) {
        updatePayload.match_status = m.match_status;
        updatePayload.overridden_by_user = false;
      }

      return sb.from("requirements").update(updatePayload).eq("id", reqRow.id);
    }),
  );

  const failed = updateResults.filter((r) => r.error).length;
  const updated = requirements.length - failed;
  ```

  The `if (failed > 0) { ... }` block and final `await sb.from("tenders").update(...)` that follow remain unchanged.

---

- [ ] **Step 7: Verify typecheck passes**

  ```bash
  npm run typecheck
  ```

  Expected: no errors.

---

- [ ] **Step 8: Commit**

  ```bash
  git add app/api/tenders/\[id\]/match/route.ts
  git commit -m "parallelize match chunk loop and batch requirement DB writes"
  ```

---

## Task 3: Config — `.env.local.example`

**Files:**
- Modify: `.env.local.example`

Update the pipeline-tuning comment block to document the new defaults and the new `DRAFT_CONCURRENCY` variable.

---

- [ ] **Step 9: Update the pipeline tuning comment block**

  Open `.env.local.example`.

  Find:

  ```bash
  # Pipeline tuning — increase chunk size and reduce pacing on paid-tier models
  # MATCH_CHUNK_SIZE=40       # requirements per LLM call (default: 40)
  # DRAFT_PACING_MS=6000      # ms between draft calls, set to 0 on paid tier (default: 6000)
  ```

  Replace with:

  ```bash
  # Pipeline tuning — defaults are set for paid-tier models
  # MATCH_CHUNK_SIZE=40       # requirements per LLM call (default: 40)
  # DRAFT_CONCURRENCY=5       # parallel draft workers; set to 1 for free-tier models (default: 5)
  # DRAFT_PACING_MS=0         # ms between draft calls; set to 6000 for free-tier models (default: 0)
  ```

---

- [ ] **Step 10: Final typecheck and lint**

  ```bash
  npm run typecheck && npm run lint
  ```

  Expected: no errors or warnings introduced by these changes.

---

- [ ] **Step 11: Commit**

  ```bash
  git add .env.local.example
  git commit -m "update pipeline tuning defaults for paid-tier models"
  ```

---

## Self-review notes

**Spec coverage:**
- ✅ Parallel drafting with semaphore (Tasks 1–4)
- ✅ `DRAFT_PACING_MS` default `0` (Step 1)
- ✅ `DRAFT_CONCURRENCY` env var (Step 1)
- ✅ Parallel matching chunks via `Promise.all` (Step 5)
- ✅ Batch DB writes in matching via `Promise.all` (Step 6)
- ✅ `.env.local.example` updated (Step 9)
- ✅ Error handling contract preserved (aborted flag for rate limits; fail-fast `Promise.all` for chunks)

**Type consistency:**
- `MatchOutput` used in Step 5 — imported in the existing file header ✅
- `RateLimitedError`, `LlmJSONParseError` used in Step 2 — imported in the existing file header ✅
- `Semaphore` class defined in Step 1, used in Step 2 — same file ✅
- `typeof capabilities[number]` — `capabilities` is declared in the same route handler scope ✅

**Placeholder scan:** no TBDs, no "similar to task N", all code blocks complete ✅
