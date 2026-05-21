"use client";

import { useEffect, useState } from "react";
import type { TenderFull } from "@/lib/types";
import { InkStroke } from "./InkStroke";

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
    { label: "Extracting requirements.", state: "complete" },
    { label: "Matching against capabilities.", state: matchState },
    { label: draftLabel, state: draftState },
    { label: "Identifying risks.", state: risksState },
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
    if (pending) { setVisible(true); setDismissing(false); return; }
    if (!visible) return;
    const t1 = setTimeout(() => setDismissing(true), 1_200);
    const t2 = setTimeout(() => setVisible(false), 1_520);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pending, visible]);

  if (!visible) return null;

  const steps = derivePipelineSteps(tender);
  const activeIdx = steps.findIndex((s) => s.state === "active");

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "industrial-border bg-surface p-6 transition-opacity duration-300",
        dismissing ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-6">
        Response Pipeline
      </p>
      <div className="flex items-center justify-between relative">
        {/* Track line */}
        <div className="absolute top-[7px] left-0 w-full h-px bg-outline-variant z-0" />
        {/* Progress line */}
        <div
          className="absolute top-[5px] left-0 h-1 bg-primary z-0 transition-all duration-700"
          style={{ width: `${(Math.max(0, activeIdx) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, i) => (
          <div key={i} className="relative z-10 flex flex-col items-center gap-2">
            {step.state === "active" ? (
              <div className="w-6 h-6 rounded-full bg-primary border-4 border-surface flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 rounded-full bg-on-primary" />
              </div>
            ) : step.state === "complete" ? (
              <div className="w-4 h-4 rounded-full bg-primary border-4 border-surface ring-1 ring-primary" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-surface-container border-4 border-surface ring-1 ring-outline-variant" />
            )}
            <span
              className={[
                "font-label-md text-label-md text-center max-w-[80px]",
                step.state === "active"
                  ? "text-primary font-extrabold underline decoration-primary decoration-2"
                  : step.state === "complete"
                  ? "text-on-surface font-bold"
                  : "text-on-surface-variant",
              ].join(" ")}
            >
              {step.label.replace(".", "")}
              {step.state === "active" && <InkStroke className="ml-1 inline-block" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
