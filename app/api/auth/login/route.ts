import { NextResponse } from "next/server";
import { z } from "zod";
import {
  passcodeMatches,
  sessionCookieMaxAge,
  sessionCookieName,
  signSession,
} from "@/lib/auth";

const bodySchema = z.object({ passcode: z.string().min(1).max(200) });

export async function POST(req: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!passcodeMatches(parsed.passcode)) {
    // 401 with a small artificial delay to discourage brute force
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  const token = await signSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: sessionCookieName,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionCookieMaxAge,
  });
  return res;
}
