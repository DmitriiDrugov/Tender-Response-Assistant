import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

const patchSchema = z
  .object({
    decision: z
      .enum(["accept", "mitigate", "clarify", "escalate_legal", "exclude_from_offer", "no_bid_trigger", "false_positive"])
      .nullable()
      .optional(),
    mitigation: z.string().nullable().optional(),
    business_impact: z.string().nullable().optional(),
    owner_name: z.string().nullable().optional(),
    team: z.string().nullable().optional(),
    is_false_positive: z.boolean().optional(),
    false_positive_reason: z.string().nullable().optional(),
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
  if ("decision" in body) update.decision = body.decision;
  if ("mitigation" in body) update.mitigation = body.mitigation;
  if ("business_impact" in body) update.business_impact = body.business_impact;
  if ("owner_name" in body) update.owner_name = body.owner_name;
  if ("team" in body) update.team = body.team;
  if ("is_false_positive" in body) {
    update.is_false_positive = body.is_false_positive;
    if (body.is_false_positive === false) update.false_positive_reason = null;
  }
  if ("false_positive_reason" in body) update.false_positive_reason = body.false_positive_reason;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const r = await sb
    .from("risks")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (r.error || !r.data)
    return NextResponse.json({ error: r.error?.message ?? "Update failed." }, { status: 500 });
  return NextResponse.json(r.data);
}
