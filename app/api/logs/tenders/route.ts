import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const sb = supabaseServer();
  const res = await sb
    .from("tenders")
    .select("id, title")
    .order("created_at", { ascending: false });
  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 500 });
  }
  return NextResponse.json({ tenders: res.data ?? [] });
}
