"use client";
import { InkStroke } from "./InkStroke";
import type { PipelineStatus } from "@/lib/types";

type Stage = "extraction" | "matching" | "drafting" | "risks";
const STAGE_LABEL: Record<Stage, string> = {
  extraction: "Extracting requirements",
  matching: "Matching against capabilities",
  drafting: "Drafting responses",
  risks: "Identifying risks",
};

export type PipelineState = {
  extraction_status: PipelineStatus;
  matching_status: PipelineStatus;
  drafting_status: PipelineStatus;
  risks_status: PipelineStatus;
  drafting_progress_done: number;
  drafting_progress_total: number;
  last_error: string | null;
};

function activeStage(s: PipelineState): Stage | null {
  if (s.extraction_status === "running") return "extraction";
  if (s.matching_status === "running") return "matching";
  if (s.drafting_status === "running") return "drafting";
  if (s.risks_status === "running") return "risks";
  return null;
}

function isFailed(s: PipelineState): Stage | null {
  if (s.extraction_status === "failed") return "extraction";
  if (s.matching_status === "failed") return "matching";
  if (s.drafting_status === "failed") return "drafting";
  if (s.risks_status === "failed") return "risks";
  return null;
}

function allComplete(s: PipelineState): boolean {
  return (
    s.extraction_status === "complete" &&
    s.matching_status === "complete" &&
    s.drafting_status === "complete" &&
    s.risks_status === "complete"
  );
}

export function PipelineProgress({ state }: { state: PipelineState }) {
  const failed = isFailed(state);
  if (failed) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-baseline gap-3 text-14 text-accent"
      >
        <span className="font-medium">Failed at {STAGE_LABEL[failed].toLowerCase()}.</span>
        {state.last_error ? (
          <span className="text-ink-muted">{state.last_error}</span>
        ) : null}
      </div>
    );
  }

  const stage = activeStage(state);
  if (!stage) {
    if (allComplete(state)) {
      return (
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-14 text-ink-2">
          <span className="dot" style={{ background: "var(--status-covered)" }} />
          <span>Ready for review.</span>
        </div>
      );
    }
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-3 text-14 text-ink-muted">
        <span>Waiting to start.</span>
      </div>
    );
  }

  const detail =
    stage === "drafting" && state.drafting_progress_total > 0
      ? `Drafting ${state.drafting_progress_done} of ${state.drafting_progress_total} responses.`
      : `${STAGE_LABEL[stage]}.`;

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 text-14 text-ink-2">
      <InkStroke />
      <span>{detail}</span>
    </div>
  );
}
