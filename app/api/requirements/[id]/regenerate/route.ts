import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { LlmJSONParseError, RateLimitedError, llmJSON } from "@/lib/llm/client";
import { draftSchema } from "@/lib/llm/schemas";
import { enforceEvidenceBoundDraft, normalizeMatchStatus } from "@/lib/llm/draft-guard";

type DraftCapability = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  evidence: string | null;
};

export const runtime = "nodejs";
export const maxDuration = 60;

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();

  const reqRes = await sb.from("requirements").select("*").eq("id", id).single();
  if (reqRes.error || !reqRes.data) {
    return NextResponse.json({ error: "Requirement not found." }, { status: 404 });
  }
  const r = reqRes.data;

  const capsRes = await sb.from("capabilities").select("id, category, name, description, evidence");
  const capabilities = (capsRes.data || []) as DraftCapability[];
  const matchedCapabilities: DraftCapability[] = ((r.matched_capability_ids || []) as string[])
    .map((cid: string) => capabilities.find((c) => c.id === cid))
    .filter((c: (typeof capabilities)[number] | undefined): c is (typeof capabilities)[number] => !!c);
  const matchedNames = matchedCapabilities.map((c) => c.name);

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

  try {
    const output = await llmJSON({
      promptFile: "draft",
      variables: {
        REQUIREMENT_AND_MATCH_JSON: JSON.stringify(requirementAndMatch, null, 2),
        COMPANY_EVIDENCE: evidenceText,
      },
      model: process.env.OPENROUTER_MODEL_DRAFT || "anthropic/claude-3-haiku",
      schema: draftSchema,
      route: "draft-regen",
      tenderId: r.tender_id,
    });
    const guarded = enforceEvidenceBoundDraft({
      output,
      matchStatus: normalizeMatchStatus(r.match_status),
      isMandatory: r.is_mandatory,
      gapDescription: r.gap_description,
      matchedEvidence: matchedCapabilities,
    });

    const upd = await sb
      .from("requirements")
      .update({
        draft_response: guarded.draft_response,
        reviewer_notes: guarded.reviewer_notes,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (upd.error || !upd.data) {
      return NextResponse.json({ error: upd.error?.message ?? "Update failed." }, { status: 500 });
    }
    return NextResponse.json(upd.data);
  } catch (err) {
    if (err instanceof RateLimitedError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof LlmJSONParseError) {
      return NextResponse.json(
        { error: "Model returned an unparseable response. Try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
