import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();

  const [tenderRes, lotsRes, reqsRes, risksRes, docsRes, criteriaRes] = await Promise.all([
    sb.from("tenders").select("*").eq("id", id).single(),
    sb.from("tender_lots").select("*").eq("tender_id", id),
    sb
      .from("requirements")
      .select("*")
      .eq("tender_id", id)
      .order("ordinal", { ascending: true }),
    sb
      .from("risks")
      .select("*")
      .eq("tender_id", id)
      .order("severity", { ascending: true }),
    sb
      .from("required_documents")
      .select("*")
      .eq("tender_id", id)
      .order("name", { ascending: true }),
    sb.from("evaluation_criteria").select("*").eq("tender_id", id),
  ]);

  if (tenderRes.error || !tenderRes.data) {
    return NextResponse.json({ error: "Tender not found." }, { status: 404 });
  }

  return NextResponse.json({
    ...tenderRes.data,
    lots: lotsRes.data ?? [],
    requirements: reqsRes.data ?? [],
    risks: risksRes.data ?? [],
    required_documents: docsRes.data ?? [],
    evaluation_criteria: criteriaRes.data ?? [],
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();

  // Best-effort: remove the PDF from storage first
  const t = await sb.from("tenders").select("pdf_storage_path").eq("id", id).single();
  if (t.data?.pdf_storage_path) {
    await sb.storage.from("tender-pdfs").remove([t.data.pdf_storage_path]);
  }

  const del = await sb.from("tenders").delete().eq("id", id);
  if (del.error) {
    return NextResponse.json({ error: del.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
