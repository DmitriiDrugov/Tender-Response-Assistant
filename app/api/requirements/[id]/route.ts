import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

const patchSchema = z
  .object({
    draft_response: z.string().nullable().optional(),
    reviewer_notes: z.string().nullable().optional(),
    reviewed: z.boolean().optional(),
    match_status: z
      .enum(["fully_covered", "partially_covered", "not_covered", "unclear"])
      .nullable()
      .optional(),
    matched_capability_ids: z.array(z.string().uuid()).optional(),
    next_action: z.string().nullable().optional(),
    owner_name: z.string().nullable().optional(),
    team: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    workflow_status: z
      .enum(["not_started", "waiting_input", "in_progress", "in_review", "blocked", "done", "not_applicable"])
      .optional(),
  })
  .strict();

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if ("draft_response" in body) update.draft_response = body.draft_response;
  if ("reviewer_notes" in body) update.reviewer_notes = body.reviewer_notes;
  if ("matched_capability_ids" in body) update.matched_capability_ids = body.matched_capability_ids;
  if ("next_action" in body) update.next_action = body.next_action;
  if ("owner_name" in body) update.owner_name = body.owner_name;
  if ("team" in body) update.team = body.team;
  if ("due_date" in body) update.due_date = body.due_date;
  if ("workflow_status" in body) update.workflow_status = body.workflow_status;
  if (body.reviewed != null) {
    update.reviewed_at = body.reviewed ? new Date().toISOString() : null;
  }
  if (body.match_status !== undefined) {
    update.match_status = body.match_status;
    update.overridden_by_user = true;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const r = await sb
    .from("requirements")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (r.error || !r.data) {
    return NextResponse.json({ error: r.error?.message ?? "Update failed." }, { status: 500 });
  }
  return NextResponse.json(r.data);
}
