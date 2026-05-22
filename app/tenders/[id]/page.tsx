import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { TenderDashboard } from "@/components/TenderDashboard";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import type { TenderFull, Capability } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadTender(id: string): Promise<TenderFull | null> {
  const sb = supabaseServer();
  const [tenderRes, lotsRes, reqsRes, risksRes, docsRes, criteriaRes, clarificationsRes] = await Promise.all([
    sb.from("tenders").select("*").eq("id", id).single(),
    sb.from("tender_lots").select("*").eq("tender_id", id),
    sb.from("requirements").select("*").eq("tender_id", id).order("ordinal"),
    sb.from("risks").select("*").eq("tender_id", id),
    sb.from("required_documents").select("*").eq("tender_id", id).order("name"),
    sb.from("evaluation_criteria").select("*").eq("tender_id", id),
    sb.from("clarification_questions").select("*").eq("tender_id", id).order("created_at"),
  ]);
  if (tenderRes.error || !tenderRes.data) return null;
  return {
    ...tenderRes.data,
    lots: lotsRes.data ?? [],
    requirements: reqsRes.data ?? [],
    risks: risksRes.data ?? [],
    required_documents: docsRes.data ?? [],
    evaluation_criteria: criteriaRes.data ?? [],
    clarification_questions: clarificationsRes.data ?? [],
  } as TenderFull;
}

async function loadCapabilities(): Promise<Capability[]> {
  const sb = supabaseServer();
  const res = await sb.from("capabilities").select("*").order("category").order("name");
  return (res.data as Capability[]) ?? [];
}

export default async function TenderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Trigger header read so Next doesn't try to statically render this dynamic route
  void headers();
  const [tender, capabilities] = await Promise.all([loadTender(id), loadCapabilities()]);
  if (!tender) notFound();
  return (
    <Shell>
      <TenderDashboard initial={tender} initialCapabilities={capabilities} />
    </Shell>
  );
}
