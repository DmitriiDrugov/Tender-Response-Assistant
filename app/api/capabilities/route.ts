import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const sb = supabaseServer();
  const res = await sb
    .from("capabilities")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json({ capabilities: res.data ?? [] });
}

const createSchema = z.object({
  category: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  description: z.string().max(4000).nullable().optional(),
  evidence: z.string().max(4000).nullable().optional(),
});

export async function POST(req: Request) {
  const sb = supabaseServer();
  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const res = await sb.from("capabilities").insert(body).select("*").single();
  if (res.error || !res.data) {
    return NextResponse.json({ error: res.error?.message ?? "Insert failed." }, { status: 500 });
  }
  return NextResponse.json(res.data);
}

const SEED: Array<{ category: string; name: string; description: string; evidence: string }> = [
  {
    category: "Certifications",
    name: "ISO 9001 Quality Management",
    description: "Quality management system certified to ISO 9001:2015 across all operating sites.",
    evidence: "Cert ID QMS-9001-2024-DE-014, valid through 2027-06-30. Issued by TÜV Süd.",
  },
  {
    category: "Certifications",
    name: "ISO 14001 Environmental Management",
    description: "Environmental management system certified to ISO 14001:2015.",
    evidence: "Cert ID EMS-14001-2024-DE-009, valid through 2026-11-12.",
  },
  {
    category: "Certifications",
    name: "IEC 61508 Functional Safety SIL2",
    description: "Engineering staff certified for IEC 61508 SIL2 system design and verification.",
    evidence: "14 staff certified by TÜV Rheinland (2022 – 2024). Reference projects available on request.",
  },
  {
    category: "Past projects",
    name: "ASRS deployment, automotive tier-1 supplier",
    description:
      "Greenfield Automated Storage and Retrieval System, 18,000 pallet positions, throughput 1,200 pallets/hr peak. Commissioned 2023.",
    evidence: "Project ref ASRS-2023-AUT-04. Acceptance signed off 2023-09-12.",
  },
  {
    category: "Past projects",
    name: "Shuttle system retrofit, consumer goods DC",
    description:
      "Brownfield shuttle integration into a live DC, zero downtime cutover across 11 weekends.",
    evidence: "Project ref SHT-2022-CG-11. Customer reference letter on file.",
  },
  {
    category: "Past projects",
    name: "AGV fleet, 38 units, pharmaceutical logistics",
    description: "AGV deployment for cleanroom-adjacent pharma operations, GxP-aligned commissioning.",
    evidence: "Project ref AGV-2024-PH-02. Validation documentation per GAMP 5.",
  },
  {
    category: "Technical",
    name: "SAP EWM integration",
    description:
      "In-house competency in SAP Extended Warehouse Management interface design, IDOC + REST channel implementations.",
    evidence: "6 EWM go-lives 2020 – 2024. Solution architect team of 8.",
  },
  {
    category: "Technical",
    name: "Manhattan SCALE integration",
    description: "Integration experience with Manhattan SCALE WMS, including custom adapter development.",
    evidence: "3 SCALE integration projects, most recent 2024-Q1.",
  },
  {
    category: "Team & coverage",
    name: "24/7 hotline support, DE/AT/CH",
    description:
      "Multilingual L1/L2 service desk in Stuttgart with on-call escalation to L3 engineering.",
    evidence: "SLA-backed response times: P1 ≤ 30 min, P2 ≤ 2 hr. Available continuously since 2019.",
  },
  {
    category: "Team & coverage",
    name: "On-site engineering, Central Europe",
    description:
      "Field engineering team of 42 deployed across DE/AT/CH/CZ/PL with shared resource pool.",
    evidence: "Average dispatch-to-site time: 4.5 hours in covered regions.",
  },
];

export async function PUT() {
  // Seed-from-template — adds the starter rows. Idempotent on (category, name) by name lookup.
  const sb = supabaseServer();
  const existing = await sb.from("capabilities").select("category, name");
  const have = new Set(
    (existing.data ?? []).map((r) => `${r.category.toLowerCase()}::${r.name.toLowerCase()}`),
  );
  const toInsert = SEED.filter(
    (s) => !have.has(`${s.category.toLowerCase()}::${s.name.toLowerCase()}`),
  );
  if (toInsert.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }
  const ins = await sb.from("capabilities").insert(toInsert).select("id");
  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, inserted: ins.data?.length ?? 0 });
}
