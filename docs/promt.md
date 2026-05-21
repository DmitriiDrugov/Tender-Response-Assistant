You are working on my existing Tender Response Assistant application.

Context:
This is a Next.js + Supabase + LLM pipeline application for bid/tender specialists. The app takes a tender PDF, extracts tender metadata, requirements, mandatory documents, risks, evaluation criteria, matches requirements against a company capability matrix, generates draft procurement-style responses, and exports DOCX.

The goal is to make the application much more understandable and useful for business users and tender specialists. Right now it looks like an AI analyzer. I want it to become a practical tender workspace: it should clearly show what the tender specialist should do next, what blocks submission, what documents are missing, what risks require action, what can be answered, and whether the company should bid.

Important:
Do NOT implement feature #25 from the previous improvement list: do not build a complex reviewer approval flow such as “Reviewed by Bid Manager / Technical Owner / Legal / Approved for Export”. Keep the existing simple reviewed/mark reviewed behavior if it already exists, but do not build a multi-stage approval workflow.

Before coding:
1. Inspect the current project structure.
2. Identify existing database tables, Supabase schema, types, API routes/server actions, LLM prompt logic, UI pages/components, export logic and capability matrix logic.
3. Preserve all existing functionality.
4. Do not rewrite the whole app from scratch.
5. Implement changes incrementally and cleanly.
6. If some features require new DB fields/tables, add migrations or SQL changes consistently with the existing Supabase setup.
7. Make sure TypeScript types are updated.
8. Keep the UI professional, simple, enterprise-like and understandable for non-technical tender/business users.

Main product direction:
The application should not communicate “AI analyzed a tender”.
It should communicate:
“This tender is not ready because X documents are missing, Y risks require review, Z requirements need input, and here are the next actions.”

Implement the following improvements.

============================================================
1. Convert the main tender page into a Tender Workspace
============================================================

Currently the app likely has tabs such as:
Analysis | Capabilities | Export

Refactor the tender detail page into a clearer workflow-oriented workspace.

Suggested tabs/sections:
- Overview
- Compliance Check
- Requirements
- Gaps
- Documents
- Risks
- Clarifications
- Action Plan
- Export

Each major section should have a clear business purpose and status:
- Not started
- In review
- Blocked
- Ready

Do not overcomplicate permissions or approval roles.

Acceptance criteria:
- A tender specialist can immediately understand where to start.
- The top of the page shows the most important status information.
- Existing Analysis/Capabilities/Export functionality remains accessible.

============================================================
2. Add Bid / No-Bid Recommendation
============================================================

Add a business-facing “Bid Readiness” or “Bid / No-Bid Recommendation” card on the tender overview.

Possible recommendation values:
- Strong Bid
- Conditional Bid
- High Risk Bid
- No-Bid Recommended

The recommendation should be derived from existing analysis:
- missing mandatory requirements
- missing required documents
- high risks
- unresolved unclear requirements
- partial/not covered requirements
- reviewed status
- submission deadline proximity

Example:
Bid readiness: 72%
Recommendation: Conditional Bid
Reasons:
- No missing mandatory requirements
- 6 required documents are still missing
- 1 high risk requires review
- 4 draft responses still need review

Acceptance criteria:
- The recommendation is explainable.
- The UI shows reasons, not just a percentage.
- If the logic is uncertain, show “Conditional Bid” rather than pretending certainty.

============================================================
3. Separate Coverage from Submission Readiness
============================================================

Improve the top KPI area.

Do not show only:
“75% fully covered”

Instead separate:
A) Bid coverage:
- fully covered
- partially covered
- missing
- unclear

B) Submission readiness:
- required documents prepared/uploaded
- mandatory requirements reviewed
- draft responses reviewed
- open high risks
- pending clarification questions

Example:
Bid coverage:
3 fully covered
1 partially covered
0 missing mandatory
0 unclear

Submission readiness:
Required documents: 0/6 approved
Reviewer checks: 0/4
Open high risks: 1
Clarification questions: 3 pending

Acceptance criteria:
- Business users understand that “coverage” and “ready to submit” are different concepts.
- Existing coverage stats remain available but are renamed/clarified.

============================================================
4. Add Requirement Type
============================================================

Add a field to each requirement:
requirement_type

Possible values:
- Bid Compliance
- Operational Delivery
- Technical / IT
- Commercial
- Legal / Contractual
- Document Requirement
- Reporting / KPI
- User Management
- EHS / Safety
- Other

This is critical because not every requirement should be matched against operational capabilities.

Examples:
“Submit one consolidated offer” = Bid Compliance
“Provide SAP EWM readiness” = Technical / IT
“Provide reference letter” = Document Requirement
“Support warehouse ramp-down” = Operational Delivery
“Report SLA KPIs” = Reporting / KPI

Update extraction prompt and/or post-processing logic to classify requirement_type.

Acceptance criteria:
- Requirements list shows requirement type.
- Filtering by requirement type is available.
- Matching/draft logic can use requirement_type to produce better answers.

============================================================
5. Add Next Action for each Requirement
============================================================

Add a business-facing “Next action” field for each requirement.

Possible values:
- Ready for review
- Ask Operations for evidence
- Ask IT/WMS owner
- Prepare document
- Send clarification question
- Add scope exception
- Legal review required
- Pricing input required
- Mark as not applicable
- No action needed

Generate a suggested next action from:
- match status
- requirement type
- mandatory/optional
- risk flags
- missing evidence
- unclear wording

Acceptance criteria:
- Requirements table has a Next Action column.
- Requirement detail view explains why that next action was suggested.
- Next action can be edited manually by the user.

============================================================
6. Add Owner / Team / Due Date / Status
============================================================

Add workflow fields to requirements, risks, required documents, clarification questions and action plan items where appropriate:

- owner_name or owner
- team
- due_date
- workflow_status

Suggested teams:
- Bid Manager
- Warehouse Operations
- IT / WMS
- Legal
- Pricing
- Purchasing
- Project Manager
- LSP Partner
- EHS

Suggested workflow statuses:
- Not started
- Waiting input
- In progress
- In review
- Blocked
- Done
- Not applicable

Acceptance criteria:
- Business users can assign responsibility.
- These fields are persisted in Supabase.
- Existing data is not broken.
- These fields appear in the Action Plan.

============================================================
7. Add Clarification Questions Generator
============================================================

Add a new “Clarifications” section.

When a requirement is unclear, partial, risky, ambiguous or missing evidence, the system should suggest a clarification question to send to the buyer/customer.

Each clarification question should include:
- source requirement
- reason
- suggested question
- priority
- deadline relevance
- status: Draft / Approved / Sent / Not needed

Example:
Requirement:
Supplier shall support user access management for German warehouses.

Suggested clarification:
Please clarify whether the supplier is expected to operate user management directly in the customer’s IAM/WMS environment or only provide structured access request templates and validation support.

Acceptance criteria:
- Clarification questions can be generated from unclear/partial/risky requirements.
- User can edit the text.
- User can mark question status.
- Clarification questions appear in the Action Plan and exports.

============================================================
8. Add Draft Response Quality Checklist
============================================================

Next to each generated draft response, add a response quality checklist.

Checklist items:
- Directly answers requirement
- Uses approved evidence
- No unsupported claims
- Mentions exclusions or assumptions if needed
- Needs human review

If there is a problem, show warnings:
- Unsupported claim detected
- Capability evidence missing
- Draft too generic
- Legal/commercial wording required
- Requirement unclear

Acceptance criteria:
- Draft responses are not presented as automatically final.
- The user can see why a draft is safe or unsafe.
- The checklist is generated/stored or computed consistently.

============================================================
9. Add Evidence Panel
============================================================

Improve requirement detail view.

For every requirement, show:

Requirement → Capability → Gap → Action

Evidence panel should include:
- original requirement quote
- matched capability/capabilities
- evidence used
- evidence strength: High / Medium / Low
- missing evidence
- source location/page/section if available

Example:
Evidence used:
- Capability: Lot-based proposal preparation
- Internal process: Scope exception register
- Document: Standard commercial proposal template

Evidence strength: Medium
Missing evidence: Final selected lots are not confirmed.

Acceptance criteria:
- Tender specialist can understand why something is marked as covered/partial/missing.
- Evidence is explicit, not hidden inside AI text.

============================================================
10. Add Blocked Draft Status
============================================================

If evidence is insufficient, the app should not generate an overconfident answer.

Add draft status values:
- Generated
- Needs review
- Blocked: missing evidence
- Blocked: legal risk
- Edited by reviewer
- Approved / Reviewed if this already exists in current app

Do not build complex multi-person approval workflow.

Example blocked state:
Draft blocked
Reason: No approved capability found for SAP EWM integration readiness.
Next action: Ask IT/WMS owner to confirm capability or mark as exception.

Acceptance criteria:
- Draft generation respects missing evidence.
- The system can block draft generation instead of hallucinating.
- User can manually override or add evidence and regenerate.

============================================================
11. Improve Required Documents into a Real Checklist
============================================================

Currently required documents may be only listed.

Turn Required Documents into a practical checklist with:
- document name
- required/optional
- source section
- owner
- due date
- status
- upload/mark prepared action
- included in export flag

Statuses:
- Missing
- Requested
- In progress
- Uploaded
- Prepared
- Approved
- Not applicable

Important:
User-set document status must survive re-extraction. If the tender is re-analyzed, do not wipe Uploaded/Prepared/Approved statuses. Merge by canonical key/document name and mark outdated items as stale if needed.

Acceptance criteria:
- Required document status is persisted.
- Status survives re-analysis.
- User can upload/mark prepared/assign owner.
- Missing required documents affect submission readiness.

============================================================
12. Improve Risks with Business Impact and Decision
============================================================

Update the Risks panel to make risks actionable.

Each risk should have:
- severity
- category
- source location
- description
- recommended action
- business impact
- owner/team
- decision
- mitigation
- include in clarification?
- include in contract exceptions?

Risk decision values:
- Accept
- Mitigate
- Clarify
- Escalate to legal
- Exclude from offer
- No-bid trigger
- False positive

Acceptance criteria:
- Risk panel becomes a working risk register, not just an AI list.
- Business users can decide what to do with each risk.
- High risks affect bid readiness/submission readiness.

============================================================
13. Add False Positive / Ignore for AI Risks
============================================================

Add a way to mark an AI-detected risk as false positive.

False positive reasons:
- Normal procurement requirement
- Already covered
- Not relevant
- Duplicate risk
- Low business impact
- Incorrect extraction

Acceptance criteria:
- User can mark risk false positive.
- False positives do not count as active open risks.
- They remain visible for audit/history, but visually de-emphasized.

============================================================
14. Add Risk Deduplication / Clustering
============================================================

Avoid duplicate AI risk findings.

If several risks are semantically similar, group them into a risk cluster.

Example:
Risk cluster: Ambiguous process improvement scope
Related requirements: REQ-012, REQ-018
Severity: Medium
Decision: Clarify

Acceptance criteria:
- Similar risks are grouped or deduplicated.
- UI does not overwhelm the user with repeated risks.
- Original related source requirements remain visible.

============================================================
15. Add Management Brief
============================================================

Add a “Generate Management Brief” feature.

This should create a short executive summary for a decision-maker.

Suggested content:
- tender title
- deadline
- estimated value
- bid readiness
- recommendation
- key positives
- main blockers
- missing documents
- high risks
- required decisions
- next steps

Example:
Tender: Warehouse Relocation and User Management Automation
Deadline: 19 Jun 2026
Estimated value: €1,000,000
Bid readiness: Conditional Bid

Key positives:
- No missing mandatory requirements detected
- Strong fit in warehouse project governance
- User-management automation aligns with scope

Main blockers:
- 6 required documents missing
- 1 partial capability coverage
- SLA penalties require legal review

Recommended next steps:
1. Assign document owners
2. Confirm SAP/WMS integration scope
3. Prepare clarification questions by 5 Jun
4. Review commercial risk clauses

Acceptance criteria:
- Brief can be displayed in UI.
- Brief can be exported as DOCX or included in export package if existing export structure allows.
- Brief is concise and business-friendly.

============================================================
16. Add Action Plan Section
============================================================

Create a dedicated Action Plan section.

It should aggregate action items from:
- missing requirements
- partial requirements
- unclear requirements
- risks
- required documents
- clarification questions

Columns:
- priority
- action
- source
- owner
- team
- due date
- status
- blocker

Example:
High | Upload commercial proposal template | Required document | Bid Manager | Missing
High | Confirm user access automation scope | REQ-021 | IT/WMS | Waiting input
Medium | Review SLA penalty clause | Risk COM-005 | Legal | In review

Acceptance criteria:
- Action Plan is the central “what to do next” view.
- Items can be filtered by owner/team/status/priority.
- Action Plan affects management brief/submission readiness.

============================================================
17. Add Tender Timeline
============================================================

Add timeline data and UI:
- tender publication date
- clarification deadline
- internal review deadline
- final approval deadline
- submission deadline

Show deadline warnings:
- Clarification deadline in X days
- Submission deadline in X days
- Required documents still missing
- Legal review/risk decision not completed

Acceptance criteria:
- Timeline appears on overview.
- Deadlines influence priority and readiness.
- If dates are missing, show “not found” and allow manual edit.

============================================================
18. Add Source Map
============================================================

Create a source map showing which tender document sections were analyzed.

Example:
Section 1: General information — extracted
Section 2: Scope of work — 18 requirements
Section 3: Eligibility — 6 requirements
Section 4: Required documents — 6 documents
Section 5: Evaluation criteria — extracted
Annex A: User access template — 9 requirements

Acceptance criteria:
- Tender specialist can see document coverage.
- Helps build trust that AI did not miss major sections.
- Source map can show counts per section.

============================================================
19. Improve Extraction Depth
============================================================

The demo must not extract only 4 requirements from a large tender.

Improve extraction prompt and/or chunking logic so that the system extracts:
- operational requirements
- bid compliance requirements
- document requirements
- commercial requirements
- eligibility requirements
- legal/contractual requirements
- annex requirements
- IT/WMS/user-management requirements

Target for demo:
- 35–50 requirements from a medium tender
- 20–30 mandatory
- 10–20 optional
- 6–10 required documents
- 5–8 meaningful risks
- 5–8 evaluation criteria

Important:
Do not inflate by creating fake duplicates. Extract actual distinct requirements.

Acceptance criteria:
- Large tender documents produce a realistic number of requirements.
- Requirements have source quotes.
- Requirements are categorized and typed.
- The app handles partial extraction gracefully.

============================================================
20. Add Confidence Explanation
============================================================

Do not show only:
Confidence: High

Show:
Confidence: High
Reason: Requirement uses explicit “shall” wording and appears in Section 3.1.

Or:
Confidence: Medium
Reason: Requirement is implied by Annex A but not stated as mandatory in the main body.

Acceptance criteria:
- Every important AI classification has a short explanation.
- Confidence feels explainable, not random.

============================================================
21. Improve Business Labels for Statuses
============================================================

Keep internal statuses if needed, but show more business-friendly labels in UI.

Mapping:
fully_covered → Ready for review
partially_covered → Needs input
not_covered → Gap
unclear → Clarification needed

Acceptance criteria:
- UI labels are understandable to business users.
- Technical status can still exist internally.
- Filters use business-friendly names where appropriate.

============================================================
22. Improve Requirement-Capability-Gap-Action Display
============================================================

In requirement detail view, show a clear chain:

Requirement:
Supplier shall provide user management automation.

Matched company capability:
Role-based access templates for warehouse operators and supervisors.

Gap:
No evidence for direct SAP IAM integration.

Suggested action:
Confirm whether template-based user access process is acceptable or ask IT owner for SAP IAM capability.

Acceptance criteria:
- User immediately sees why a requirement is or is not covered.
- Gap and action are explicit.

============================================================
23. Make Capability Matrix More Business-Friendly
============================================================

Update capability matrix fields and UI.

Each capability should ideally include:
- capability name
- business description
- category
- evidence
- related documents
- owner
- confidence
- last reviewed date

Example:
Capability: Warehouse relocation project governance
Description: Ability to plan and coordinate ramp-down, cutover and ramp-up activities across warehouse teams.
Evidence: 2 previous relocation projects, project plan template, weekly steering process.
Owner: Project Management Office
Last reviewed: 2026-05-21

Acceptance criteria:
- Capability matrix is understandable by tender/business users.
- Capability evidence is visible and reusable in draft responses.
- Existing capability matching does not break.

============================================================
24. Add Evidence Library
============================================================

Add or simulate an Evidence Library that can support draft responses.

Evidence types:
- case studies
- reference projects
- certifications
- team profiles
- standard policies
- insurance documents
- technical descriptions
- KPI reports

Evidence items should be linkable to capabilities and requirements.

Acceptance criteria:
- Draft responses can reference approved evidence.
- Evidence can be reused across tenders.
- If no evidence exists, the draft can be blocked.

============================================================
26. Improve Exports
============================================================

Add multiple export types if not already present.

1. DOCX Bid Response
Final tender response document.

2. XLSX Tender Control Register
Worksheets:
- Overview
- Requirements
- Gaps
- Risks
- Required Documents
- Clarification Questions
- Action Plan

3. Management Brief
DOCX or included section in export package.

Acceptance criteria:
- XLSX export is available.
- Export includes actionability fields: owner, due date, status, next action, risk decision.
- Existing DOCX export continues working.

============================================================
27. Add Submission Package Completeness
============================================================

Add a clear business metric:
Submission package completeness: X%

Components:
- required documents approved/prepared
- mandatory requirements reviewed
- draft responses reviewed
- open high risks
- clarification questions pending
- missing mandatory gaps

Example:
Submission package completeness: 43%
Required documents: 0/6 approved
Mandatory requirements reviewed: 0/3
Draft responses reviewed: 0/4
Open high risks: 1
Clarification questions pending: 3

Acceptance criteria:
- Metric appears on overview.
- Metric is not the same as capability coverage.
- Blockers are listed clearly.

============================================================
28. Add “What Changed After Re-Analysis”
============================================================

When the tender is re-extracted/re-analyzed, show a change summary:

- new requirements
- updated requirements
- removed/stale requirements
- preserved user-reviewed items
- preserved uploaded documents
- changed risk findings

Example:
New requirements: 5
Updated requirements: 8
Removed/stale requirements: 2
User-reviewed items preserved: 17

Acceptance criteria:
- Re-analysis does not silently overwrite user work.
- User sees what changed.
- Human edits/statuses are preserved where possible.

============================================================
29. Protect Human Edits
============================================================

Important:
AI regeneration must not overwrite human-edited or approved/reviewed content without confirmation.

Rules:
- If a draft was manually edited, mark it as “Edited by reviewer”.
- Regenerate should create a proposed new version, not overwrite the edited version automatically.
- User can accept or reject regenerated version.
- Human document statuses and reviewer notes must survive re-analysis.

Acceptance criteria:
- Human work is protected.
- User does not fear clicking re-analyze/regenerate.
- Existing reviewed statuses remain stable.

============================================================
30. Add Diff View for Regenerated Responses
============================================================

When a draft response is regenerated, show:
- previous draft
- new draft
- highlighted changes if feasible
- accept / reject buttons

If highlighting is too expensive, show side-by-side text with accept/reject.

Acceptance criteria:
- Regeneration is controlled.
- User can compare changes before accepting.

============================================================
31. Add AI Assumptions Block
============================================================

When the AI makes an inference, show it explicitly.

Example:
Assumption:
The requirement appears to apply to all selected lots.

Needs confirmation:
Final selected lots are not yet confirmed.

Acceptance criteria:
- Assumptions are visible.
- Assumptions can influence next actions and clarification questions.
- Draft responses avoid presenting assumptions as facts.

============================================================
32. Add Red Flag Banner
============================================================

If there are critical blockers, show a top banner.

Examples:
Submission not ready:
6 required documents are missing.
1 high risk requires review.
4 requirements are not reviewed.

Button:
View blockers

Acceptance criteria:
- Blockers are visible immediately.
- Clicking “View blockers” filters or opens relevant items.

============================================================
33. Add Business Glossary / Tooltips
============================================================

Add small tooltips or help text for business terms.

Examples:
Coverage = how well company capabilities match tender requirements.
Submission readiness = whether the bid package is ready to submit.
Gap = requirement that is not fully supported by approved evidence.
Clarification = question to ask the buyer before the deadline.

Acceptance criteria:
- New users can understand the screen without training.
- Tooltips are concise and not intrusive.

============================================================
34. Improve Empty / Partial States
============================================================

Replace passive empty states with useful guidance.

Example:
Bad:
Prepared / uploaded: 0/6

Better:
No documents uploaded yet.
Start by uploading the commercial proposal template and company profile.

Buttons:
Upload document
Assign owner

Acceptance criteria:
- Empty states explain what to do next.
- This applies to documents, risks, clarifications, action plan, exports.

============================================================
35. Add Demo Mode Explanation
============================================================

Add a small demo explanation block for the current demo scenario.

Example:
Demo scenario:
Warehouse relocation, ramp-down support, logistics operations and user management automation.

Goal:
Show how AI can reduce manual tender analysis while keeping human review and auditability.

Acceptance criteria:
- Useful for interviews and demos.
- Does not pollute normal production workflow; make it dismissible or only visible in demo mode.

============================================================
AI Prompt / Extraction Improvements
============================================================

Update LLM prompts to enforce the following behavior:

1. Extract all distinct requirements, not only a few summary requirements.
2. Preserve source quotes.
3. Classify requirement_type.
4. Classify mandatory/optional.
5. Generate business-friendly next_action.
6. Separate bid compliance from operational capabilities.
7. Do not match bid compliance requirements to random technical capabilities.
8. Draft responses must be evidence-based.
9. If evidence is missing, block the draft instead of hallucinating.
10. Generate clarification questions for unclear/partial/risky requirements.
11. Generate risks with deduplication and business impact.
12. Provide confidence explanation.
13. Provide AI assumptions separately.

Draft response style:
Use procurement-style wording:
- “We confirm...”
- “The proposal will include...”
- “The supplier will provide...”
- “Any exclusions will be clearly stated...”
- “Evidence is attached in Annex...”

Avoid generic SaaS language such as:
- “utilizing their Tender requirement management module”
unless the requirement specifically asks for such a tool.

============================================================
UI Style Direction
============================================================

Keep the UI:
- clean
- enterprise-like
- calm
- business-readable
- suitable for tender managers, purchasing teams and operations teams

Avoid:
- chatbot-style UX
- excessive animations
- startup landing page design
- overcomplicated role permissions
- overengineering

Use clear cards, tables, filters, badges, drawers and action buttons.

============================================================
Priority Order
============================================================

If this is too much to implement in one pass, prioritize in this order:

Priority 1:
- Tender Workspace structure
- Bid / No-Bid recommendation
- Coverage vs Submission Readiness
- Action Plan
- Required Documents checklist
- Owner / Team / Due Date / Status
- Red Flag Banner

Priority 2:
- Requirement type
- Next action
- Evidence panel
- Blocked draft status
- Clarification questions
- Risk decisions and false positives

Priority 3:
- Extraction depth
- Confidence explanations
- Source map
- Management brief
- XLSX export
- Human edit protection and regenerated draft diff

Priority 4:
- Evidence library
- Business glossary/tooltips
- Demo explanation
- Re-analysis change summary

============================================================
Final Acceptance Criteria
============================================================

After implementation, a tender specialist should be able to:

1. Upload a tender PDF.
2. See whether the tender is a Strong Bid, Conditional Bid, High Risk Bid, or No-Bid Recommended.
3. Understand what blocks submission.
4. See all mandatory requirements.
5. See which requirements need input, clarification, legal review or evidence.
6. Assign owners and due dates.
7. Track required documents.
8. Review meaningful risks and mark false positives.
9. Generate clarification questions.
10. Review draft responses based only on evidence.
11. Export DOCX and XLSX.
12. Produce a short management brief.
13. Re-analyze without losing human edits/statuses.
14. Use the app as a real tender workspace, not just an AI analysis page.

Do not implement multi-stage reviewer approval workflow from feature #25.
Keep the implementation practical, clean and demo-ready.