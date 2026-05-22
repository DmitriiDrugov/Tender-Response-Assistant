import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { LlmJSONParseError, RateLimitedError, llmJSON } from "@/lib/llm/client";
import { riskWrappedSchema } from "@/lib/llm/schemas";
import { logPipelineEvent } from "@/lib/pipeline-logger";

export const runtime = "nodejs";
export const maxDuration = 120;

const paramsSchema = z.object({ id: z.string().uuid() });
const MAX_TEXT_CHARS = 120_000;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();

  const tenderRes = await sb
    .from("tenders")
    .select("id, raw_text")
    .eq("id", id)
    .single();
  if (tenderRes.error || !tenderRes.data) {
    return NextResponse.json({ error: "Tender not found." }, { status: 404 });
  }
  const rawText = (tenderRes.data.raw_text as string) || "";
  if (!rawText) {
    return NextResponse.json({ error: "Tender has no extracted text." }, { status: 422 });
  }

  await sb.from("tenders").update({ risks_status: "running", last_error: null }).eq("id", id);
  await logPipelineEvent(id, "risks", "running");

  const tenderText = rawText.length > MAX_TEXT_CHARS ? rawText.slice(0, MAX_TEXT_CHARS) : rawText;

  try {
    const output = await llmJSON({
      promptFile: "risk",
      variables: { TENDER_TEXT: tenderText },
      model: process.env.OPENROUTER_MODEL_RISK || "anthropic/claude-3-haiku",
      schema: riskWrappedSchema,
      route: "risk",
      tenderId: id,
    });

    const delRes = await sb.from("risks").delete().eq("tender_id", id);
    if (delRes.error) {
      await sb
        .from("tenders")
        .update({ risks_status: "failed", last_error: delRes.error.message })
        .eq("id", id);
      return NextResponse.json({ error: "Failed to clear existing risks." }, { status: 500 });
    }

    if (output.length > 0) {
      const insRes = await sb.from("risks").insert(
        output.map((r) => ({
          tender_id: id,
          category: r.category,
          description: r.description,
          source_location: r.source_location,
          severity: r.severity,
          recommended_action: r.recommended_action,
        })),
      );
      if (insRes.error) {
        await sb
          .from("tenders")
          .update({ risks_status: "failed", last_error: insRes.error.message })
          .eq("id", id);
        return NextResponse.json({ error: "Failed to save risks." }, { status: 500 });
      }
    }

    await sb.from("tenders").update({ risks_status: "complete" }).eq("id", id);
    await logPipelineEvent(id, "risks", "complete");
    return NextResponse.json({ ok: true, count: output.length });
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
      .update({ risks_status: "failed", last_error: message })
      .eq("id", id);
    await logPipelineEvent(id, "risks", "failed", message);
    return NextResponse.json({ error: message }, { status: httpStatus });
  }
}
