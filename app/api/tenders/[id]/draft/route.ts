import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { LlmJSONParseError, RateLimitedError, llmJSON } from "@/lib/llm/client";
import { draftSchema } from "@/lib/llm/schemas";
import { enforceEvidenceBoundDraft, normalizeMatchStatus } from "@/lib/llm/draft-guard";
import { logPipelineEvent } from "@/lib/pipeline-logger";

export const runtime = "nodejs";
export const maxDuration = 300;

const paramsSchema = z.object({ id: z.string().uuid() });

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
// (the previous server process was killed before it could finish).
// maxDuration is 300 s; allow 60 s margin for queue/cold-start before declaring stale.
const STALE_THRESHOLD_MS = 6 * 60 * 1000;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();

  const tenderRes = await sb
    .from("tenders")
    .select("id, matching_status, drafting_status, updated_at")
    .eq("id", id)
    .single();
  if (tenderRes.error || !tenderRes.data) {
    return NextResponse.json({ error: "Tender not found." }, { status: 404 });
  }
  if (tenderRes.data.matching_status !== "complete") {
    return NextResponse.json(
      { error: "Matching must complete before drafting." },
      { status: 409 },
    );
  }

  // Guard against concurrent runs. If a run is already active (recently updated),
  // reject. If it is stale (process was killed by a timeout), recover and resume.
  if (tenderRes.data.drafting_status === "running") {
    const staleness = Date.now() - new Date(tenderRes.data.updated_at as string).getTime();
    if (staleness < STALE_THRESHOLD_MS) {
      return NextResponse.json(
        { error: "Drafting is already in progress." },
        { status: 409 },
      );
    }
    // Stale run: reset any requirements left mid-generation so they are re-attempted.
    await sb
      .from("requirements")
      .update({ draft_status: "pending" })
      .eq("tender_id", id)
      .eq("draft_status", "generating");
  }

  const reqsRes = await sb
    .from("requirements")
    .select(
      "id, ordinal, text, category, is_mandatory, source_excerpt, match_status, matched_capability_ids, gap_description, suggested_action, confidence, draft_response, draft_status",
    )
    .eq("tender_id", id)
    .order("ordinal", { ascending: true });
  if (reqsRes.error) {
    return NextResponse.json({ error: reqsRes.error.message }, { status: 500 });
  }
  const requirements = reqsRes.data || [];
  if (requirements.length === 0) {
    await sb
      .from("tenders")
      .update({ drafting_status: "complete", drafting_progress_total: 0 })
      .eq("id", id);
    return NextResponse.json({ ok: true, drafts: 0 });
  }

  const capsRes = await sb
    .from("capabilities")
    .select("id, category, name, description, evidence");
  const capabilities = capsRes.data || [];
  const capById = new Map<string, (typeof capabilities)[number]>();
  for (const c of capabilities) capById.set(c.id, c);

  const alreadyDone = requirements.filter(
    (r) => r.draft_status === "ready" || r.draft_status === "blocked",
  ).length;

  await sb
    .from("tenders")
    .update({
      drafting_status: "running",
      drafting_progress_total: requirements.length,
      drafting_progress_done: alreadyDone,
      last_error: null,
    })
    .eq("id", id);
  await logPipelineEvent(id, "draft", "running");

  const model = process.env.OPENROUTER_MODEL_DRAFT || "meta-llama/llama-3.3-70b-instruct:free";

  const sleep = PACING_MS > 0
    ? (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
    : null;

  let done = alreadyDone;
  let lastError: string | null = null;
  let aborted = false;
  const abortState: { error: RateLimitedError | null } = { error: null };

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
            abortState.error = err;
            await sb
              .from("requirements")
              .update({ draft_status: "failed" })
              .eq("id", r.id);
            return;
          }
          lastError =
            err instanceof LlmJSONParseError
              ? "Model returned an unparseable response."
              : err instanceof Error
                ? err.message
                : "Unknown error.";
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

  if (aborted && abortState.error) {
    await sb
      .from("tenders")
      .update({
        drafting_status: "failed",
        last_error:
          "Free-tier rate limit reached during drafting. Re-run drafting to resume where it stopped.",
        drafting_progress_done: done,
      })
      .eq("id", id);
    await logPipelineEvent(id, "draft", "failed", abortState.error.message);
    return NextResponse.json({ error: abortState.error.message }, { status: 429 });
  }

  await sb
    .from("tenders")
    .update({
      drafting_status: "complete",
      drafting_progress_done: done,
      last_error: lastError,
    })
    .eq("id", id);
  await logPipelineEvent(id, "draft", "complete");

  return NextResponse.json({ ok: true, drafts: done, total: requirements.length });
}
