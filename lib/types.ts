/** Database row shapes — single source of truth for tender data passed to the frontend. */

export type PipelineStatus = "pending" | "running" | "complete" | "failed";

export type DraftStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'blocked'
  | 'failed'
  | 'skipped';

export type RequirementType =
  | "Bid Compliance"
  | "Operational Delivery"
  | "Technical / IT"
  | "Commercial"
  | "Legal / Contractual"
  | "Document Requirement"
  | "Reporting / KPI"
  | "User Management"
  | "EHS / Safety"
  | "Other";

export type WorkflowStatus =
  | "not_started"
  | "waiting_input"
  | "in_progress"
  | "in_review"
  | "blocked"
  | "done"
  | "not_applicable";

export type Team =
  | "Bid Manager"
  | "Warehouse Operations"
  | "IT / WMS"
  | "Legal"
  | "Pricing"
  | "Purchasing"
  | "Project Manager"
  | "LSP Partner"
  | "EHS";

export type EvidenceStrength = "high" | "medium" | "low";

export type Tender = {
  id: string;
  title: string;
  issuing_authority: string | null;
  country: string | null;
  language: string | null;
  publication_date: string | null;
  submission_deadline: string | null;
  clarification_deadline: string | null;
  internal_review_deadline: string | null;
  final_approval_deadline: string | null;
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
  management_brief: string | null;
  bid_recommendation: string | null;
  bid_readiness_score: number | null;
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
  requirement_type: RequirementType | null;
  is_mandatory: boolean;
  source_excerpt: string | null;
  match_status: MatchStatus;
  matched_capability_ids: string[];
  gap_description: string | null;
  suggested_action: string | null;
  confidence: "high" | "medium" | "low" | null;
  confidence_reason: string | null;
  ai_assumptions: string | null;
  evidence_used: string[];
  evidence_strength: EvidenceStrength | null;
  draft_response: string | null;
  draft_status: DraftStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  overridden_by_user: boolean;
  next_action: string | null;
  owner_name: string | null;
  team: string | null;
  due_date: string | null;
  workflow_status: WorkflowStatus;
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

export type RiskDecision =
  | "accept"
  | "mitigate"
  | "clarify"
  | "escalate_legal"
  | "exclude_from_offer"
  | "no_bid_trigger"
  | "false_positive";

export type Risk = {
  id: string;
  tender_id: string;
  category: string;
  description: string;
  source_location: string | null;
  severity: "critical" | "high" | "medium" | "low";
  recommended_action: string | null;
  business_impact: string | null;
  owner_name: string | null;
  team: string | null;
  decision: RiskDecision | null;
  mitigation: string | null;
  is_false_positive: boolean;
  false_positive_reason: string | null;
};

export type DocumentStatus =
  | "missing"
  | "requested"
  | "in_progress"
  | "uploaded"
  | "prepared"
  | "needs_review"
  | "approved"
  | "not_applicable";

export type RequiredDocument = {
  id: string;
  tender_id: string;
  name: string;
  status: DocumentStatus;
  is_required: boolean;
  source_section: string | null;
  owner_name: string | null;
  due_date: string | null;
};

export type EvaluationCriterion = {
  id: string;
  tender_id: string;
  criterion: string;
  weight_percent: number | null;
};

export type ClarificationPriority = "high" | "medium" | "low";
export type ClarificationStatus = "draft" | "approved" | "sent" | "not_needed";

export type ClarificationQuestion = {
  id: string;
  tender_id: string;
  requirement_id: string | null;
  reason: string | null;
  question_text: string;
  priority: ClarificationPriority;
  status: ClarificationStatus;
  created_at: string;
  updated_at: string;
};

export type TenderFull = Tender & {
  lots: TenderLot[];
  requirements: Requirement[];
  risks: Risk[];
  required_documents: RequiredDocument[];
  evaluation_criteria: EvaluationCriterion[];
  clarification_questions: ClarificationQuestion[];
};

export type RequirementCounts = {
  total: number;
  covered: number;
  partial: number;
  missing: number;
  unclear: number;
  mandatory: number;
  reviewed: number;
  missing_mandatory: number;
};
