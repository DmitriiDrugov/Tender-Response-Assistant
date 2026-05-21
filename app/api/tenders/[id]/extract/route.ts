import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { llmJSON, RateLimitedError, LlmJSONParseError } from "@/lib/llm/client";
import { extractSchema } from "@/lib/llm/schemas";
import { logPipelineEvent } from "@/lib/pipeline-logger";

export const runtime = "nodejs";
export const maxDuration = 120;

const paramsSchema = z.object({ id: z.string().uuid() });

function isoDate(s: string | null | undefined): string | null {
  if (!s) return null;
  // Normalise to Date first so we can validate month/day range.
  // A bare YYYY-MM-DD is parsed as UTC midnight; other formats go through Date().
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  // Reject dates the parser silently clamped (e.g. "2005-00-00" → invalid).
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
}

// Trim huge PDF text to a reasonable bound; the free models can't handle 200k tokens.
const MAX_TEXT_CHARS = 120_000;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();

  const tenderRes = await sb
    .from("tenders")
    .select("id, raw_text, extraction_status")
    .eq("id", id)
    .single();
  if (tenderRes.error || !tenderRes.data) {
    return NextResponse.json({ error: "Tender not found." }, { status: 404 });
  }
  if (tenderRes.data.extraction_status === "running") {
    return NextResponse.json({ error: "Extraction is already in progress." }, { status: 409 });
  }
  const rawText = (tenderRes.data.raw_text as string) || "";
  if (!rawText) {
    return NextResponse.json({ error: "Tender has no extracted text." }, { status: 422 });
  }

  await sb.from("tenders").update({ extraction_status: "running", last_error: null }).eq("id", id);
  await logPipelineEvent(id, "extract", "running");

  const tenderText = rawText.length > MAX_TEXT_CHARS ? rawText.slice(0, MAX_TEXT_CHARS) : rawText;
  const wasTruncated = rawText.length > MAX_TEXT_CHARS;

  try {
    const output = await llmJSON({
      promptFile: "extract",
      variables: { TENDER_TEXT: tenderText },
      model: process.env.OPENROUTER_MODEL_EXTRACT || "deepseek/deepseek-chat:free",
      schema: extractSchema,
      route: "extract",
      tenderId: id,
    });

    const metaRes = await sb
      .from("tenders")
      .update({
        title: output.title || "Untitled tender",
        issuing_authority: output.issuing_authority,
        country: output.country,
        language: output.language,
        tender_id_external: output.tender_id_external,
        publication_date: isoDate(output.publication_date),
        submission_deadline: isoDate(output.submission_deadline),
        submission_method: output.submission_method,
        estimated_value_amount: output.estimated_value?.amount ?? null,
        estimated_value_currency: output.estimated_value?.currency ?? null,
        contract_duration: output.contract_duration,
        scope_summary: output.scope_summary,
        // reset downstream pipeline so the user sees fresh state
        matching_status: "pending",
        drafting_status: "pending",
        risks_status: "pending",
        drafting_progress_done: 0,
        drafting_progress_total: output.requirements.length,
      })
      .eq("id", id);
    if (metaRes.error) {
      await sb
        .from("tenders")
        .update({ extraction_status: "failed", last_error: metaRes.error.message })
        .eq("id", id);
      return NextResponse.json({ error: "Failed to save extraction metadata." }, { status: 500 });
    }

    // Idempotent: clear and rewrite child tables.
    // required_documents is excluded — it is upserted below to preserve user-set status.
    const delResults = await Promise.all([
      sb.from("tender_lots").delete().eq("tender_id", id),
      sb.from("requirements").delete().eq("tender_id", id),
      sb.from("evaluation_criteria").delete().eq("tender_id", id),
      sb.from("risks").delete().eq("tender_id", id),
    ]);
    const delErr = delResults.find((r) => r.error)?.error;
    if (delErr) {
      await sb
        .from("tenders")
        .update({ extraction_status: "failed", last_error: delErr.message })
        .eq("id", id);
      return NextResponse.json({ error: "Failed to clear existing data." }, { status: 500 });
    }

    if (output.lots.length > 0) {
      const lotsRes = await sb.from("tender_lots").insert(
        output.lots.map((l) => ({
          tender_id: id,
          lot_id_external: l.lot_id_external,
          title: l.title,
          description: l.description,
          estimated_value_amount: l.estimated_value?.amount ?? null,
          estimated_value_currency: l.estimated_value?.currency ?? null,
        })),
      );
      if (lotsRes.error) {
        await sb
          .from("tenders")
          .update({ extraction_status: "failed", last_error: lotsRes.error.message })
          .eq("id", id);
        return NextResponse.json({ error: "Failed to save lots." }, { status: 500 });
      }
    }

    if (output.requirements.length > 0) {
      const reqsRes = await sb.from("requirements").insert(
        output.requirements.map((r, idx) => ({
          tender_id: id,
          ordinal: idx,
          text: r.text,
          category: r.category,
          is_mandatory: r.is_mandatory,
          source_excerpt: r.source_excerpt,
        })),
      );
      if (reqsRes.error) {
        await sb
          .from("tenders")
          .update({ extraction_status: "failed", last_error: reqsRes.error.message })
          .eq("id", id);
        return NextResponse.json({ error: "Failed to save requirements." }, { status: 500 });
      }
    }

    if (output.required_documents.length > 0) {
      // Upsert on (tender_id, name) so existing rows keep their user-set status.
      const docsRes = await sb
        .from("required_documents")
        .upsert(
          output.required_documents.map((name) => ({ tender_id: id, name })),
          { onConflict: "tender_id,name", ignoreDuplicates: true },
        );
      if (docsRes.error) {
        await sb
          .from("tenders")
          .update({ extraction_status: "failed", last_error: docsRes.error.message })
          .eq("id", id);
        return NextResponse.json({ error: "Failed to save required documents." }, { status: 500 });
      }
    }

    if (output.evaluation_criteria.length > 0) {
      const critRes = await sb.from("evaluation_criteria").insert(
        output.evaluation_criteria.map((c) => ({
          tender_id: id,
          criterion: c.criterion,
          weight_percent: c.weight_percent,
        })),
      );
      if (critRes.error) {
        await sb
          .from("tenders")
          .update({ extraction_status: "failed", last_error: critRes.error.message })
          .eq("id", id);
        return NextResponse.json({ error: "Failed to save evaluation criteria." }, { status: 500 });
      }
    }

    // Single atomic update: status + optional truncation warning in one write so
    // polling clients never see "complete" without the accompanying note.
    await sb
      .from("tenders")
      .update({
        extraction_status: "complete",
        last_error: wasTruncated
          ? `Document was truncated to ${MAX_TEXT_CHARS.toLocaleString()} characters (${Math.round(rawText.length / 1000)} k total). Requirements beyond this point were not extracted.`
          : null,
      })
      .eq("id", id);
    await logPipelineEvent(id, "extract", "complete");

    return NextResponse.json({
      ok: true,
      requirement_count: output.requirements.length,
      was_truncated: wasTruncated,
    });
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
      .update({ extraction_status: "failed", last_error: message })
      .eq("id", id);
    await logPipelineEvent(id, "extract", "failed", message);
    return NextResponse.json({ error: message }, { status: httpStatus });
  }
}
