import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

const querySchema = z.object({
  tender_id: z.string().uuid().optional(),
  stage: z.enum(["extract", "match", "draft", "risks"]).optional(),
  status: z.enum(["running", "complete", "failed"]).optional(),
  page: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { tender_id, stage, status, page } = parsed.data;

  const sb = supabaseServer();
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = sb
    .from("pipeline_events")
    .select(
      "id, created_at, tender_id, stage, status, error, tenders(title)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (tender_id) query = query.eq("tender_id", tender_id);
  if (stage) query = query.eq("stage", stage);
  if (status) query = query.eq("status", status);

  const res = await query;
  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 500 });
  }

  const rows = (res.data ?? []).map((r) => {
    const tRow = (r as unknown as { tenders: { title: string } | null }).tenders;
    const { tenders: _drop, ...rest } = r as Record<string, unknown>;
    return { ...rest, tender_title: tRow?.title ?? null };
  });

  return NextResponse.json({ rows, total: res.count ?? 0 });
}
