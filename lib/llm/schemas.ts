import { z } from "zod";

/**
 * Zod schemas for every LLM output shape. Each schema is also the contract
 * the model is held to by `llmJSON` — failures here trigger a single retry
 * with a corrective system message before surfacing.
 */

const moneySchema = z
  .object({
    amount: z.number().nullable(),
    currency: z.string().nullable(),
  })
  .nullable();

const requirementTypeSchema = z.enum([
  "Bid Compliance",
  "Operational Delivery",
  "Technical / IT",
  "Commercial",
  "Legal / Contractual",
  "Document Requirement",
  "Reporting / KPI",
  "User Management",
  "EHS / Safety",
  "Other",
]);

export const extractSchema = z.object({
  title: z.string(),
  issuing_authority: z.string().nullable(),
  country: z.string().nullable(),
  language: z.string().nullable(),
  tender_id_external: z.string().nullable(),
  publication_date: z.string().nullable(),
  submission_deadline: z.string().nullable(),
  clarification_deadline: z.string().nullable().optional(),
  submission_method: z.string().nullable(),
  estimated_value: moneySchema,
  contract_duration: z.string().nullable(),
  scope_summary: z.string(),
  lots: z.array(
    z.object({
      lot_id_external: z.string().nullable(),
      title: z.string().nullable(),
      description: z.string().nullable(),
      estimated_value: moneySchema,
    }),
  ),
  requirements: z.array(
    z.object({
      text: z.string(),
      category: z.string().nullable(),
      requirement_type: requirementTypeSchema.optional().nullable(),
      is_mandatory: z.boolean(),
      source_excerpt: z.string().nullable(),
      confidence_reason: z.string().nullable().optional(),
    }),
  ),
  // The next three default to [] so a response truncated mid-`requirements`
  // can still validate after the bracket-balancer recovers what's there.
  required_documents: z
    .union([
      z.array(z.string()),
      z.array(
        z.object({
          name: z.string(),
          is_required: z.boolean().optional(),
          source_section: z.string().nullable().optional(),
        }),
      ),
    ])
    .default([]),
  evaluation_criteria: z
    .array(
      z.object({
        criterion: z.string().nullable(),
        weight_percent: z.number().nullable(),
      }),
    )
    .default([]),
  notes: z.array(z.string()).default([]),
});
export type ExtractOutput = z.infer<typeof extractSchema>;

export const matchStatusSchema = z.enum([
  "fully_covered",
  "partially_covered",
  "not_covered",
  "unclear",
]);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

export const matchItemSchema = z.object({
  requirement_index: z.number().int().nonnegative(),
  match_status: matchStatusSchema,
  matched_capability_names: z.preprocess((v) => v ?? [], z.array(z.string())),
  gap_description: z.string().nullable(),
  suggested_action: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  confidence_reason: z.string().nullable().optional(),
  evidence_strength: z.enum(["high", "medium", "low"]).nullable().optional(),
});
export const matchSchema = z.array(matchItemSchema);
export type MatchOutput = z.infer<typeof matchSchema>;

/**
 * Some models return a bare object when the schema is a single-item array.
 * The match prompt asks for an array — accept either shape by wrapping in `z.preprocess`.
 */
export const matchWrappedSchema = z.preprocess((val) => {
  if (Array.isArray(val)) return val;
  const o = val as Record<string, unknown>;
  if (o && typeof o === "object") {
    for (const key of ["matches", "items", "results", "data"]) {
      if (key in o && Array.isArray(o[key])) return o[key];
    }
  }
  return val;
}, matchSchema);

export const draftSchema = z.object({
  draft_response: z.string(),
  reviewer_notes: z.string().nullable(),
  requires_bid_manager_decision: z.boolean(),
  evidence_used: z.array(z.string()),
  unsupported_claims: z.array(z.string()),
});
export type DraftOutput = z.infer<typeof draftSchema>;

export const riskSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type RiskSeverity = z.infer<typeof riskSeveritySchema>;

export const riskItemSchema = z.object({
  category: z.string(),
  description: z.string(),
  source_location: z.string(),
  severity: riskSeveritySchema,
  recommended_action: z.string(),
  business_impact: z.string().nullable().optional(),
});
export const riskSchema = z.array(riskItemSchema);
export type RiskOutput = z.infer<typeof riskSchema>;

export const riskWrappedSchema = z.preprocess((val) => {
  if (Array.isArray(val)) return val;
  if (val && typeof val === "object" && "risks" in val && Array.isArray((val as { risks: unknown[] }).risks)) {
    return (val as { risks: unknown[] }).risks;
  }
  if (val && typeof val === "object" && "items" in val && Array.isArray((val as { items: unknown[] }).items)) {
    return (val as { items: unknown[] }).items;
  }
  return val;
}, riskSchema);
