import { NextResponse } from "next/server";
import { z } from "zod";
import { Packer } from "docx";
import { supabaseServer } from "@/lib/supabase/server";
import { buildExportDocx } from "@/lib/docx-builder";
import type { TenderFull } from "@/lib/types";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  included_section_ids: z.array(z.string().uuid()).optional(),
});

async function loadTenderFull(id: string): Promise<TenderFull | null> {
  const sb = supabaseServer();
  const [tenderRes, lotsRes, reqsRes, risksRes, docsRes, criteriaRes] = await Promise.all([
    sb.from("tenders").select("*").eq("id", id).single(),
    sb.from("tender_lots").select("*").eq("tender_id", id),
    sb.from("requirements").select("*").eq("tender_id", id).order("ordinal"),
    sb.from("risks").select("*").eq("tender_id", id),
    sb.from("required_documents").select("*").eq("tender_id", id).order("name"),
    sb.from("evaluation_criteria").select("*").eq("tender_id", id),
  ]);
  if (tenderRes.error || !tenderRes.data) return null;
  return {
    ...tenderRes.data,
    lots: lotsRes.data ?? [],
    requirements: reqsRes.data ?? [],
    risks: risksRes.data ?? [],
    required_documents: docsRes.data ?? [],
    evaluation_criteria: criteriaRes.data ?? [],
  } as TenderFull;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const tender = await loadTenderFull(id);
  if (!tender) return NextResponse.json({ error: "Tender not found." }, { status: 404 });

  const allReqIds = tender.requirements.map((r) => r.id);
  const included =
    body.included_section_ids && body.included_section_ids.length > 0
      ? body.included_section_ids
      : allReqIds;

  const doc = buildExportDocx({ tender, includedRequirementIds: included });
  const docBuffer = await Packer.toBuffer(doc);
  // Buffer's typed-array variance gets rejected by `BodyInit` in some TS lib combos;
  // copy into a fresh ArrayBuffer so the constructor accepts it without casts.
  const ab = new ArrayBuffer(docBuffer.byteLength);
  new Uint8Array(ab).set(docBuffer);

  const safeTitle = (tender.title || "tender").replace(/[^a-z0-9\-_. ]/gi, "_").slice(0, 80);
  const filename = `${safeTitle} - response draft.docx`;

  return new NextResponse(ab, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(ab.byteLength),
    },
  });
}
