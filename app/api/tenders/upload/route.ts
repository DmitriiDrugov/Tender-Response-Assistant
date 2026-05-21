import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 415 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 25 MB limit." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;
  try {
    text = await extractPdfText(buffer);
  } catch (err) {
    return NextResponse.json(
      { error: "Could not parse PDF.", detail: (err as Error).message },
      { status: 422 },
    );
  }

  if (!text || text.trim().length < 200) {
    return NextResponse.json(
      { error: "PDF appears empty or unreadable. If scanned, OCR is required." },
      { status: 422 },
    );
  }

  const sb = supabaseServer();
  const storageId = `${randomUUID()}.pdf`;
  const storagePath = `uploads/${storageId}`;

  const upload = await sb.storage
    .from("tender-pdfs")
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });
  if (upload.error) {
    return NextResponse.json(
      { error: "Storage upload failed.", detail: upload.error.message },
      { status: 500 },
    );
  }

  const insert = await sb
    .from("tenders")
    .insert({
      title: file.name.replace(/\.pdf$/i, "") || "Untitled tender",
      raw_text: text,
      pdf_storage_path: storagePath,
      extraction_status: "pending",
      matching_status: "pending",
      drafting_status: "pending",
      risks_status: "pending",
    })
    .select("id")
    .single();

  if (insert.error || !insert.data) {
    // best-effort cleanup
    await sb.storage.from("tender-pdfs").remove([storagePath]);
    return NextResponse.json(
      { error: "Database insert failed.", detail: insert.error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: insert.data.id });
}
