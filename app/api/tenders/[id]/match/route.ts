import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { LlmJSONParseError, RateLimitedError, llmJSON } from "@/lib/llm/client";
import { matchWrappedSchema } from "@/lib/llm/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

const paramsSchema = z.object({ id: z.string().uuid() });

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

  const reqsRes = await sb
    .from("requirements")
    .select("id, ordinal, text, category, is_mandatory, source_excerpt")
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

  const requirementsForPrompt = requirements.map((r, idx) => ({
    index: idx,
    text: r.text,
    category: r.category,
    is_mandatory: r.is_mandatory,
  }));

  const capabilitiesForPrompt = capabilities.map((c) => ({
    category: c.category,
    name: c.name,
    description: c.description,
    evidence: c.evidence,
  }));

  try {
    const output = await llmJSON({
      promptFile: "match",
      variables: {
        REQUIREMENTS_JSON: JSON.stringify(requirementsForPrompt, null, 2),
        CAPABILITY_MATRIX_JSON: JSON.stringify(capabilitiesForPrompt, null, 2),
      },
      model: process.env.OPENROUTER_MODEL_MATCH || "deepseek/deepseek-chat:free",
      schema: matchWrappedSchema,
      route: "match",
      tenderId: id,
    });

    const byIndex = new Map<number, (typeof output)[number]>();
    for (const item of output) byIndex.set(item.requirement_index, item);

    // Per-requirement updates; small N (≤ ~400)
    let updated = 0;
    for (let i = 0; i < requirements.length; i++) {
      const reqRow = requirements[i];
      if (!reqRow) continue;
      const m = byIndex.get(i);
      if (!m) continue;
      const matchedIds = m.matched_capability_names
        .map((n) => capabilityByName.get(n.toLowerCase()))
        .filter((x): x is string => !!x);

      const upd = await sb
        .from("requirements")
        .update({
          match_status: m.match_status,
          matched_capability_ids: matchedIds,
          gap_description: m.gap_description,
          suggested_action: m.suggested_action,
          confidence: m.confidence,
          overridden_by_user: false,
        })
        .eq("id", reqRow.id);
      if (!upd.error) updated++;
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

    return NextResponse.json({ ok: true, matched: updated });
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
}
