import type { DraftOutput } from "@/lib/llm/schemas";

export type MatchStatus = "fully_covered" | "partially_covered" | "not_covered" | "unclear" | null;

export type DraftEvidenceItem = {
  name: string;
  description: string | null;
  evidence: string | null;
};

export function normalizeMatchStatus(value: string | null): MatchStatus {
  if (
    value === "fully_covered" ||
    value === "partially_covered" ||
    value === "not_covered" ||
    value === "unclear"
  ) {
    return value;
  }
  return null;
}

type GuardInput = {
  output: DraftOutput;
  matchStatus: MatchStatus;
  isMandatory: boolean;
  gapDescription: string | null;
  matchedEvidence: DraftEvidenceItem[];
};

function itemHasConcreteEvidence(item: DraftEvidenceItem): boolean {
  return Boolean(`${item.description ?? ""} ${item.evidence ?? ""}`.trim());
}

function decisionLine(reason: string): string {
  return `[REQUIRES BID MANAGER DECISION] ${reason}`;
}

function appendGuardNote(existing: string | null, note: string): string {
  return existing ? `${existing}\n\nEvidence guard: ${note}` : `Evidence guard: ${note}`;
}

function unsupportedClaimsNote(claims: string[]): string {
  return `Unsupported claim(s) withheld: ${claims.join("; ")}.`;
}

export function enforceEvidenceBoundDraft(input: GuardInput): DraftOutput {
  const { output, matchStatus, isMandatory, gapDescription, matchedEvidence } = input;
  const hasMatchedEvidence = matchedEvidence.some(itemHasConcreteEvidence);
  const unsupportedClaims = output.unsupported_claims.filter((claim) => claim.trim().length > 0);
  const evidenceUsed = output.evidence_used.filter((item) => item.trim().length > 0);

  if (unsupportedClaims.length > 0) {
    return {
      ...output,
      draft_response: decisionLine(
        "The draft was withheld because it contained claims that are not supported by the recorded evidence.",
      ),
      reviewer_notes: appendGuardNote(output.reviewer_notes, unsupportedClaimsNote(unsupportedClaims)),
      requires_bid_manager_decision: true,
      evidence_used: evidenceUsed,
      unsupported_claims: unsupportedClaims,
    };
  }

  if (output.requires_bid_manager_decision) {
    return {
      ...output,
      draft_response: output.draft_response.startsWith("[REQUIRES BID MANAGER DECISION]")
        ? output.draft_response
        : decisionLine(output.draft_response),
      requires_bid_manager_decision: true,
      evidence_used: evidenceUsed,
      unsupported_claims: unsupportedClaims,
    };
  }

  if ((matchStatus === "fully_covered" || matchStatus === "partially_covered") && !hasMatchedEvidence) {
    return {
      ...output,
      draft_response: decisionLine(
        "No concrete matched company evidence is recorded for this requirement. Add evidence before drafting a response.",
      ),
      reviewer_notes: appendGuardNote(
        output.reviewer_notes,
        "Matched status exists, but no concrete evidence was available to support a factual draft.",
      ),
      requires_bid_manager_decision: true,
      evidence_used: [],
      unsupported_claims: unsupportedClaims,
    };
  }

  if ((matchStatus === "fully_covered" || matchStatus === "partially_covered") && evidenceUsed.length === 0) {
    return {
      ...output,
      draft_response: decisionLine(
        "The model did not cite supporting evidence for this draft. Review the capability matrix before responding.",
      ),
      reviewer_notes: appendGuardNote(
        output.reviewer_notes,
        "Model output omitted evidence_used for a coverage claim, so the draft was withheld.",
      ),
      requires_bid_manager_decision: true,
      evidence_used: [],
      unsupported_claims: unsupportedClaims,
    };
  }

  if (matchStatus === "not_covered") {
    const reason =
      gapDescription ??
      (isMandatory
        ? "This mandatory requirement is not supported by recorded evidence."
        : "This requirement is not supported by recorded evidence.");
    return {
      ...output,
      draft_response: output.draft_response.startsWith("[REQUIRES BID MANAGER DECISION]")
        ? output.draft_response
        : decisionLine(reason),
      reviewer_notes: appendGuardNote(
        output.reviewer_notes,
        "No coverage is recorded. The response must be qualified, excluded, or backed by new evidence.",
      ),
      requires_bid_manager_decision: true,
      evidence_used: [],
      unsupported_claims: unsupportedClaims,
    };
  }

  return {
    ...output,
    evidence_used: evidenceUsed,
    unsupported_claims: unsupportedClaims,
  };
}
