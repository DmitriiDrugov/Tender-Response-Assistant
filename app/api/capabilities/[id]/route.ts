import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

const patchSchema = z
  .object({
    category: z.string().min(1).max(120).optional(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(4000).nullable().optional(),
    evidence: z.string().max(4000).nullable().optional(),
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
  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const res = await sb.from("capabilities").update(body).eq("id", id).select("*").single();
  if (res.error || !res.data) {
    return NextResponse.json({ error: res.error?.message ?? "Update failed." }, { status: 500 });
  }
  return NextResponse.json(res.data);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();
  const res = await sb.from("capabilities").delete().eq("id", id);
  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
