import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { LlmJSONParseError, RateLimitedError, llmJSON } from "@/lib/llm/client";
import { matchWrappedSchema, type MatchOutput } from "@/lib/llm/schemas";

export const runtime = "nodejs";
// Chunked matching: each chunk is one LLM call. Raise the ceiling to handle real tenders.
export const maxDuration = 300;

const paramsSchema = z.object({ id: z.string().uuid() });

// How many requirements per LLM call. Keeps output well within 8 000-token limit.
// Override with MATCH_CHUNK_SIZE env var for paid-tier models with larger output windows.
const CHUNK_SIZE = Number(process.env.MATCH_CHUNK_SIZE || "40");

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();

  const tenderRes = await sb
    .from("tenders")
    .select("id, extraction_status")
    .eq("id", id)
    .single();
  if (tenderRes.error || !tenderRes.data) {
    return NextResponse.json({ error: "Tender not found." }, { status: 404 });
  }
  if (tenderRes.data.extraction_status !== "complete") {
    return NextResponse.json(
      { error: "Extraction must complete before matching." },
      { status: 409 },
    );
  }

  // Fetch overridden_by_user so we can preserve user-set match statuses on re-run.
  const reqsRes = await sb
    .from("requirements")
    .select("id, ordinal, text, category, is_mandatory, source_excerpt, overridden_by_user")
    .eq("tender_id", id)
    .order("ordinal", { ascending: true });
  if (reqsRes.error) {
    return NextResponse.json({ error: reqsRes.error.message }, { status: 500 });
  }
  const requirements = reqsRes.data || [];
  if (requirements.length === 0) {
    await sb.from("tenders").update({ matching_status: "complete" }).eq("id", id);
    return NextResponse.json({ ok: true, matched: 0 });
  }

  const capsRes = await sb
    .from("capabilities")
    .select("id, category, name, description, evidence");
  const capabilities = capsRes.data || [];
  const capabilityByName = new Map<string, string>();
  for (const c of capabilities) capabilityByName.set(c.name.toLowerCase(), c.id);

  await sb.from("tenders").update({ matching_status: "running", last_error: null }).eq("id", id);

  const capabilitiesForPrompt = capabilities.map((c) => ({
    category: c.category,
    name: c.name,
    description: c.description,
    evidence: c.evidence,
  }));

  const model = process.env.OPENROUTER_MODEL_MATCH || "deepseek/deepseek-chat:free";

  // Build a global index map: requirement_index (in full list) → LLM result
  const byIndex = new Map<number, MatchOutput[number]>();

  const chunks = chunk(requirements, CHUNK_SIZE);

  try {
    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunkReqs = chunks[chunkIdx];
      if (!chunkReqs) continue;
      const chunkStart = chunkIdx * CHUNK_SIZE;

      // Use local indices (0..N-1) within each chunk for a clean prompt.
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

      // Remap local chunk indices to global requirement indices.
      for (const item of output) {
        const globalIdx = chunkStart + item.requirement_index;
        byIndex.set(globalIdx, item);
      }
    }
  } catch (err) {
    const message =
      err instanceof RateLimitedError
        ? err.message
        : err instanceof LlmJSONParseError
          ? "Model returned an unparseable response. Try again."
          : (err as Error).message;
    const httpStatus = err instanceof RateLimitedError ? 429 : 500;
    await sb
      .from("tenders")
      .update({ matching_status: "failed", last_error: message })
      .eq("id", id);
    return NextResponse.json({ error: message }, { status: httpStatus });
  }

  // Write results. Requirements where overridden_by_user === true keep their
  // existing match_status; all other fields (capabilities, gap, confidence) update.
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < requirements.length; i++) {
    const reqRow = requirements[i];
    if (!reqRow) continue;
    const m = byIndex.get(i);
    if (!m) continue;

    const matchedIds = m.matched_capability_names
      .map((n) => capabilityByName.get(n.toLowerCase()))
      .filter((x): x is string => !!x);

    const updatePayload: Record<string, unknown> = {
      matched_capability_ids: matchedIds,
      gap_description: m.gap_description,
      suggested_action: m.suggested_action,
      confidence: m.confidence,
    };

    // Preserve the user's manual match_status override — only update it when
    // the user has not explicitly set it, or this is a clean re-extraction run
    // (overridden_by_user is already false because requirements were deleted and re-inserted).
    if (!reqRow.overridden_by_user) {
      updatePayload.match_status = m.match_status;
      updatePayload.overridden_by_user = false;
    }

    const upd = await sb
      .from("requirements")
      .update(updatePayload)
      .eq("id", reqRow.id);

    if (upd.error) {
      failed++;
    } else {
      updated++;
    }
  }

  if (failed > 0) {
    const errMsg = `${failed} requirement(s) failed to save.`;
    await sb
      .from("tenders")
      .update({ matching_status: "failed", last_error: errMsg })
      .eq("id", id);
    return NextResponse.json(
      { error: errMsg, matched: updated, failed, total: requirements.length },
      { status: 500 },
    );
  }

  await sb
    .from("tenders")
    .update({
      matching_status: "complete",
      drafting_status: "pending",
      drafting_progress_done: 0,
      drafting_progress_total: requirements.length,
    })
    .eq("id", id);

  return NextResponse.json({
    ok: true,
    matched: updated,
    total: requirements.length,
    chunks: chunks.length,
  });
}
