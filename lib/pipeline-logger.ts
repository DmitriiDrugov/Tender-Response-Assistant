import { supabaseServer } from "@/lib/supabase/server";

export async function logPipelineEvent(
  tenderId: string,
  stage: "extract" | "match" | "draft" | "risks",
  status: "running" | "complete" | "failed",
  error?: string | null,
): Promise<void> {
  try {
    await supabaseServer()
      .from("pipeline_events")
      .insert({ tender_id: tenderId, stage, status, error: error ?? null });
  } catch {
    // Logging must never fail the pipeline request.
  }
}
