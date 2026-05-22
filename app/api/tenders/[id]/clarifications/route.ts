import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

const createSchema = z.object({
  requirement_id: z.string().uuid().nullable().optional(),
  reason: z.string().nullable().optional(),
  question_text: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]).optional(),
  status: z.enum(["draft", "approved", "sent", "not_needed"]).optional(),
});

// GET — list all clarification questions for a tender
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();
  const res = await sb
    .from("clarification_questions")
    .select("*")
    .eq("tender_id", id)
    .order("created_at", { ascending: true });
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json({ clarification_questions: res.data });
}

// POST — create a new clarification question
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const res = await sb
    .from("clarification_questions")
    .insert({
      tender_id: id,
      requirement_id: body.requirement_id ?? null,
      reason: body.reason ?? null,
      question_text: body.question_text,
      priority: body.priority ?? "medium",
      status: body.status ?? "draft",
    })
    .select("*")
    .single();

  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json(res.data, { status: 201 });
}
