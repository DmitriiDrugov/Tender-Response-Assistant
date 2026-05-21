# Tender Response Assistant

## Register
product

## Product purpose

A working internal tool for industrial-automation and warehouse-logistics suppliers responding to public tenders. It ingests a tender PDF, extracts every requirement with its source quote, matches each one against the company's capability matrix with honest gap analysis, drafts evidence-based responses for a human bid manager to edit, surfaces procurement risks, and exports a final DOCX. It is not a chatbot. It is not "AI magic." It is a triage and drafting tool for a person who already knows what a tender response should sound like.

## Users

Primary user: a bid manager at an industrial supplier (named demo target: Bosch). They typically have 7 to 21 days to respond to a 60 to 200 page tender containing 80 to 400 individual requirements. They are responsible for what gets submitted. They will reject any output that overpromises or fabricates evidence, because procurement evaluators will catch it and the company will lose the bid.

Secondary user: a subject-matter expert (engineering, certifications, logistics ops) reviewing the bid manager's draft for technical accuracy.

The user is not impressed by AI. They are impressed by:
- Traceability. Every requirement shows the exact source quote so they can verify it against the PDF.
- Honesty. A "partially covered" status with a clear gap description is more useful than a "fully covered" claim they have to second-guess.
- Speed in the boring middle. Extraction and first-pass drafting should disappear so they can spend their time on the 20% of requirements that genuinely need human judgment.

## Tone

Formal third-person procurement register. Same voice the user would use in a tender response themselves. No marketing copy, no encouragement ("Great job!"), no AI-speak ("I've analyzed your tender and..."), no exclamation marks anywhere in the UI.

Status and error messages are factual, brief, and tell the user what to do next.

## Strategic principles

1. **Reviewer-in-the-loop is the product**, not a disclaimer. The UI is built around the bid manager's editing pass, not around showcasing the model. Every model output is editable, traceable, and overridable.
2. **Source excerpts are sacred.** Every extracted requirement carries the exact PDF quote. Never paraphrase the source. Display it verbatim so the user can verify in seconds.
3. **Honest classification beats helpful classification.** Confidence is the model's certainty in its own classification, not a sales tool. "Unclear" and "not covered" are first-class statuses, not failure modes.
4. **Density is a feature.** The user is scanning 200+ requirements. Comfortable density with strong scanability wins over generous whitespace.
5. **The export looks like a procurement document, not a SaaS report.** The DOCX must be something the bid manager can hand to a procurement officer without re-formatting.

## Anti-references

Designs and patterns that would feel wrong here:

- **SaaS dashboard cliché.** Gradient hero numbers, equal card grids, glassmorphic side panels, sidebar nav with rounded gradient brand mark. This is not a Notion-adjacent productivity app.
- **AI assistant chrome.** No chat bubbles, no sparkle icons, no "✨ AI" badges, no "Powered by AI" footer, no "Ask anything" input. The model is infrastructure, not personality.
- **Observability dark mode.** This is daylight office work, not a 2am incident.
- **Fintech navy and gold.** First-order serious-business reflex. Avoid.
- **Healthcare white and teal.** Same trap, different category.
- **Side-stripe borders on cards.** Banned by the design skill; also a SaaS reflex.
- **Modal-first interaction.** Inline editing and progressive disclosure beat modals for this density of work.
- **Marketing adjectives in copy.** "World-class," "best-in-class," "cutting-edge," "innovative," "AI-powered," "intelligent," "smart" — banned in UI copy AND in any draft the model writes (the draft prompt enforces this).

## Aesthetic direction

Editorial-typographic. The reference points are:

- A serious legal document layout (think transitional serif headings, generous leading, conservative scale).
- A working analyst's screen (dense tabular data, strong typographic hierarchy, restrained color used only where it signals action).
- The kind of internal tool a procurement department would actually build for itself: utilitarian, legible at a glance, no decoration that isn't carrying meaning.

Color strategy: **Restrained.** Tinted-warm neutrals as the canvas, ink-charcoal text, one saturated accent for action and severity. No more.

Theme: **light.** Forced by the scene: bid manager working in an office, often comparing to a printed tender on the desk.

## Demo context

The demo is for Bosch industrial. The seed capability matrix should reflect a credible industrial-automation / warehouse-logistics supplier profile: ISO 9001 / 14001, IEC 61508 SIL2 experience, automotive-tier project history (no specific client names), 24/7 service coverage in DE/AT/CH, ASRS / shuttle / AGV deployments, SAP EWM and Manhattan SCALE integration experience. The first tender to test against will likely be a TED.europa.eu warehouse logistics public tender; the UI must hold up under a real document with real requirements, not a synthetic 5-requirement demo.
