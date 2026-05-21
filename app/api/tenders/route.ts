import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const sb = supabaseServer();

  const tenders = await sb
    .from("tenders")
    .select(
      "id, title, issuing_authority, submission_deadline, extraction_status, matching_status, drafting_status, risks_status, drafting_progress_done, drafting_progress_total, last_error, updated_at, created_at",
    )
    .order("updated_at", { ascending: false });

  if (tenders.error) {
    return NextResponse.json({ error: tenders.error.message }, { status: 500 });
  }

  // Coverage per tender — single aggregate query per tender for the demo size.
  const ids = (tenders.data || []).map((t) => t.id);
  const coverage = new Map<
    string,
    { total: number; covered: number; partial: number; missing: number; unclear: number }
  >();
  if (ids.length > 0) {
    const reqs = await sb
      .from("requirements")
      .select("tender_id, match_status")
      .in("tender_id", ids);
    for (const id of ids) coverage.set(id, { total: 0, covered: 0, partial: 0, missing: 0, unclear: 0 });
    for (const r of reqs.data || []) {
      const c = coverage.get(r.tender_id);
      if (!c) continue;
      c.total++;
      if (r.match_status === "fully_covered") c.covered++;
      else if (r.match_status === "partially_covered") c.partial++;
      else if (r.match_status === "not_covered") c.missing++;
      else if (r.match_status === "unclear") c.unclear++;
    }
  }

  return NextResponse.json({
    tenders: (tenders.data || []).map((t) => ({ ...t, coverage: coverage.get(t.id) })),
  });
}
