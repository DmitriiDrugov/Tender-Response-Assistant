import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { LlmJSONParseError, RateLimitedError, llmJSON } from "@/lib/llm/client";
import { draftSchema } from "@/lib/llm/schemas";
import { enforceEvidenceBoundDraft, normalizeMatchStatus } from "@/lib/llm/draft-guard";

export const runtime = "nodejs";
// Long-running pipeline. On Vercel set to platform max; locally unbounded.
export const maxDuration = 300;

const paramsSchema = z.object({ id: z.string().uuid() });

const PACING_MS = 6_000; // conservative free-tier pacing

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();

  const tenderRes = await sb
    .from("tenders")
    .select("id, matching_status")
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
    (r) => r.draft_status === 'ready' || r.draft_status === 'blocked',
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

  const model = process.env.OPENROUTER_MODEL_DRAFT || "meta-llama/llama-3.3-70b-instruct:free";

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let done = alreadyDone;
  let lastError: string | null = null;

  for (const r of requirements) {
    if (!r) continue;
    // Resume: skip requirements that were already drafted in a previous run.
    if (r.draft_status === 'ready' || r.draft_status === 'blocked') continue;
    const matchedCapabilities = ((r.matched_capability_ids || []) as string[])
      .map((cid) => capById.get(cid))
      .filter((c: (typeof capabilities)[number] | undefined): c is (typeof capabilities)[number] => !!c);
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
      .from('requirements')
      .update({ draft_status: 'generating' })
      .eq('id', r.id);

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
          draft_status: guarded.requires_bid_manager_decision ? 'blocked' : 'ready',
        })
        .eq("id", r.id);

      done++;
      // Throttle: update DB every requirement (small enough demo to be fine)
      await sb
        .from("tenders")
        .update({ drafting_progress_done: done })
        .eq("id", id);
    } catch (err) {
      if (err instanceof RateLimitedError) {
        await sb
          .from("tenders")
          .update({
            drafting_status: "failed",
            last_error:
              "Free-tier rate limit reached during drafting. Re-run drafting in a minute to resume.",
            drafting_progress_done: done,
          })
          .eq("id", id);
        return NextResponse.json({ error: err.message }, { status: 429 });
      }
      lastError =
        err instanceof LlmJSONParseError
          ? "Model returned an unparseable response."
          : (err as Error).message;
      await sb
        .from('requirements')
        .update({ draft_status: 'failed' })
        .eq('id', r.id);
      // Continue with next requirement — partial failure is acceptable for the demo;
      // the row simply stays without a draft and the user can hit Regenerate per-row.
    }

    await sleep(PACING_MS);
  }

  await sb
    .from("tenders")
    .update({
      drafting_status: "complete",
      drafting_progress_done: done,
      last_error: lastError,
    })
    .eq("id", id);

  return NextResponse.json({ ok: true, drafts: done, total: requirements.length });
}
