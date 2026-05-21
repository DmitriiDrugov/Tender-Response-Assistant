import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });
const patchSchema = z.object({
  status: z.enum(["missing", "uploaded", "needs_review", "approved"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = paramsSchema.parse(await ctx.params);
  const sb = supabaseServer();
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const res = await sb
    .from("required_documents")
    .update({ status: body.status })
    .eq("id", id)
    .select("*")
    .single();
  if (res.error || !res.data) {
    return NextResponse.json({ error: res.error?.message ?? "Update failed." }, { status: 500 });
  }
  return NextResponse.json(res.data);
}
