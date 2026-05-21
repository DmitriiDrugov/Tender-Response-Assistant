/** Database row shapes — single source of truth for tender data passed to the frontend. */

export type PipelineStatus = "pending" | "running" | "complete" | "failed";

export type DraftStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'blocked'
  | 'failed'
  | 'skipped';

export type Tender = {
  id: string;
  title: string;
  issuing_authority: string | null;
  country: string | null;
  language: string | null;
  publication_date: string | null;
  submission_deadline: string | null;
  submission_method: string | null;
  estimated_value_amount: number | null;
  estimated_value_currency: string | null;
  contract_duration: string | null;
  scope_summary: string | null;
  tender_id_external: string | null;
  pdf_storage_path: string | null;
  extraction_status: PipelineStatus;
  matching_status: PipelineStatus;
  drafting_status: PipelineStatus;
  risks_status: PipelineStatus;
  drafting_progress_total: number;
  drafting_progress_done: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type TenderLot = {
  id: string;
  tender_id: string;
  lot_id_external: string | null;
  title: string | null;
  description: string | null;
  estimated_value_amount: number | null;
  estimated_value_currency: string | null;
};

export type MatchStatus =
  | "fully_covered"
  | "partially_covered"
  | "not_covered"
  | "unclear"
  | null;

export type Requirement = {
  id: string;
  tender_id: string;
  ordinal: number;
  text: string;
  category: string | null;
  is_mandatory: boolean;
  source_excerpt: string | null;
  match_status: MatchStatus;
  matched_capability_ids: string[];
  gap_description: string | null;
  suggested_action: string | null;
  confidence: "high" | "medium" | "low" | null;
  draft_response: string | null;
  draft_status: DraftStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  overridden_by_user: boolean;
  updated_at: string;
};

export type Capability = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  evidence: string | null;
  created_at: string;
};

export type Risk = {
  id: string;
  tender_id: string;
  category: string;
  description: string;
  source_location: string | null;
  severity: "critical" | "high" | "medium" | "low";
  recommended_action: string | null;
};

export type DocumentStatus = "missing" | "uploaded" | "needs_review" | "approved";

export type RequiredDocument = {
  id: string;
  tender_id: string;
  name: string;
  status: DocumentStatus;
};

export type EvaluationCriterion = {
  id: string;
  tender_id: string;
  criterion: string;
  weight_percent: number | null;
};

export type TenderFull = Tender & {
  lots: TenderLot[];
  requirements: Requirement[];
  risks: Risk[];
  required_documents: RequiredDocument[];
  evaluation_criteria: EvaluationCriterion[];
};
