"use client";

import { useEffect, useState } from "react";
import type { TenderFull } from "@/lib/types";
import { InkStroke } from "./InkStroke";
import { cn } from "@/lib/utils";

type StepState = "complete" | "active" | "pending";
type Step = { label: string; state: StepState };

function derivePipelineSteps(tender: TenderFull): Step[] {
  const { matching_status, risks_status, drafting_status } = tender;
  const done = tender.drafting_progress_done;
  const total = tender.drafting_progress_total;

  const matchState: StepState =
    matching_status === "complete" ? "complete"
    : matching_status === "running" ? "active"
    : "pending";

  const risksState: StepState =
    risks_status === "complete" ? "complete"
    : risks_status === "running" ? "active"
    : "pending";

  const draftState: StepState =
    drafting_status === "complete" ? "complete"
    : drafting_status === "running" ? "active"
    : "pending";

  const draftLabel =
    draftState === "active" && total > 0
      ? `Drafting ${done} of ${total} responses.`
      : "Drafting responses.";

  const allDone =
    matching_status === "complete" &&
    risks_status === "complete" &&
    drafting_status === "complete";

  return [
    { label: "Matching against capabilities.", state: matchState },
    { label: "Identifying risks.", state: risksState },
    { label: draftLabel, state: draftState },
    { label: "Ready.", state: allDone ? "complete" : "pending" },
  ];
}

function hasPendingWork(tender: TenderFull): boolean {
  return (
    tender.matching_status === "running" ||
    tender.matching_status === "pending" ||
    tender.risks_status === "running" ||
    tender.risks_status === "pending" ||
    tender.drafting_status === "running" ||
    tender.drafting_status === "pending"
  );
}

export function PipelineProgressBanner({ tender }: { tender: TenderFull }) {
  const [visible, setVisible] = useState(hasPendingWork(tender));
  const [dismissing, setDismissing] = useState(false);

  const pending = hasPendingWork(tender);

  useEffect(() => {
    if (pending) {
      setVisible(true);
      setDismissing(false);
      return;
    }
    if (!visible) return;
    const t1 = setTimeout(() => setDismissing(true), 1_200);
    const t2 = setTimeout(() => setVisible(false), 1_200 + 320);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pending, visible]);

  if (!visible) return null;

  const steps = derivePipelineSteps(tender);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-b border-border bg-surface px-7 lg:px-9 py-3",
        "transition-opacity duration-320 ease-out",
        dismissing && "opacity-0",
      )}
    >
      <ol className="flex flex-wrap items-center gap-x-7 gap-y-1.5" aria-label="Analysis pipeline">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2 text-13">
            <span
              className="dot flex-shrink-0"
              style={{
                background:
                  step.state === "complete"
                    ? "var(--status-covered)"
                    : step.state === "active"
                      ? "var(--ink)"
                      : "var(--border-strong)",
              }}
              aria-hidden="true"
            />
            <span
              className={
                step.state === "active"
                  ? "text-ink"
                  : step.state === "complete"
                    ? "text-ink-2"
                    : "text-ink-faint"
              }
            >
              {step.label}
            </span>
            {step.state === "active" ? <InkStroke className="ml-1" /> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
