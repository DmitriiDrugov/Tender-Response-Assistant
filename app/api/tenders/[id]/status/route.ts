import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();

  const t = await sb
    .from("tenders")
    .select(
      "id, extraction_status, matching_status, drafting_status, risks_status, drafting_progress_done, drafting_progress_total, last_error, title, updated_at",
    )
    .eq("id", id)
    .single();
  if (t.error || !t.data) {
    return NextResponse.json({ error: "Tender not found." }, { status: 404 });
  }

  const [reqCount, riskCount, draftedCount] = await Promise.all([
    sb.from("requirements").select("id", { count: "exact", head: true }).eq("tender_id", id),
    sb.from("risks").select("id", { count: "exact", head: true }).eq("tender_id", id),
    sb
      .from("requirements")
      .select("id", { count: "exact", head: true })
      .eq("tender_id", id)
      .not("draft_response", "is", null),
  ]);

  return NextResponse.json({
    ...t.data,
    requirements_total: reqCount.count ?? 0,
    risks_total: riskCount.count ?? 0,
    drafts_completed: draftedCount.count ?? 0,
  });
}
