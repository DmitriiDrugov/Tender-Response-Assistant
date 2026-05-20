# Tender Response Assistant

An internal tool for industrial-automation and warehouse-logistics suppliers responding to public tenders. Ingests a tender PDF, extracts every requirement with its source quote, matches each requirement against a company capability matrix, drafts evidence-based responses for a human bid manager, surfaces procurement risks, and exports a DOCX.

Not a chatbot. Not "AI magic." A triage and drafting tool for someone who already knows what a tender response should sound like.

## Stack

- Next.js 15 (App Router) · TypeScript strict
- Tailwind CSS · custom design system from `DESIGN.md`
- Supabase (Postgres + Storage) via `@supabase/supabase-js`
- LLMs via [OpenRouter](https://openrouter.ai), called through the OpenAI SDK (`baseURL` override)
- `pdf-parse` for PDF extraction · `docx` for export · `zod` everywhere a boundary exists
- Lucide icons · `next/font` for Source Serif 4, Inter, JetBrains Mono

## Setup

### 1. Install

```bash
npm install
```

### 2. Provision Supabase

The demo is built against a cloud Supabase project. (Local Supabase via `supabase start` also works; the schema is the same.)

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. Optionally run `supabase/seed.sql` to insert a starter capability matrix (or use the "Seed from template" button in the UI).
4. Confirm a private bucket named `tender-pdfs` exists (the migration creates it).
5. Copy the project URL and both keys (anon + service role) for the next step.

### 3. Configure environment

Copy `.env.local.example` to `.env.local` and fill it in:

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | Server-side LLM calls. Keep secret. |
| `OPENROUTER_HTTP_REFERER` | Required by OpenRouter for free-tier routing. Set to your origin. |
| `OPENROUTER_X_TITLE` | Required by OpenRouter; displayed on their dashboard. |
| `OPENROUTER_MODEL_EXTRACT` / `_MATCH` / `_DRAFT` / `_RISK` | Per-pipeline model selection. Defaults to free tier (`deepseek/deepseek-chat:free`, `meta-llama/llama-3.3-70b-instruct:free`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (read-only operations from the browser if needed; the demo writes via service role only). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Keep secret. |
| `DEMO_PASSCODE` | Single passcode gating the demo. |
| `AUTH_COOKIE_SECRET` | 32+ char random string used to sign the session cookie. |

Generate the cookie secret with `openssl rand -hex 32` or any equivalent.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login`. Enter `DEMO_PASSCODE`.

### 5. First tender

1. Go to **Capabilities** and click **Seed from template** (or edit your own matrix).
2. Back on **Tenders**, drop a tender PDF on the upload card. A real TED.europa.eu warehouse logistics tender works well.
3. The pipeline runs: **Extracting → Matching → Risks → Drafting**. Status polls every 2s.
4. Open the tender to review and edit. Use the **Export** tab to download a DOCX.

## How the pipeline works

| Stage | Route | Prompt | Output |
|---|---|---|---|
| Extract | `POST /api/tenders/[id]/extract` | `lib/prompts/extract.md` | tender metadata + requirements + lots + required docs + evaluation criteria |
| Match | `POST /api/tenders/[id]/match` | `lib/prompts/match.md` | per-requirement `match_status` + gap + confidence |
| Risks | `POST /api/tenders/[id]/risks` | `lib/prompts/risk.md` | per-risk severity + recommended action |
| Draft | `POST /api/tenders/[id]/draft` | `lib/prompts/draft.md` | one draft per requirement (serial; respects free-tier RPM) |

Every LLM call goes through `lib/llm/client.ts`. That utility:

- Substitutes `{{VARIABLE}}` placeholders from the markdown prompt file.
- Calls OpenRouter via the OpenAI SDK with `response_format: { type: "json_object" }`.
- Strips defensive `\`\`\`json` fences and trailing commas before parsing.
- Validates every output against a zod schema in `lib/llm/schemas.ts`.
- Retries once with a corrective system message on JSON parse / schema failure.
- Retries once after 5 s on a 429, then surfaces a user-facing rate-limit error.
- Logs every call (route, model, tokens, duration, status) to `request_logs`.

Per-prompt defaults: temperature 0 for extract / match / risk, 0.3 for draft; `max_tokens` per the spec.

## Free-tier rate limits

OpenRouter's free models permit roughly 20 requests / minute / model and 200 / day. The drafting step is the one that hits this — it runs sequentially with a 250 ms pacing between requirements. If a rate limit is hit mid-draft, the route persists progress and surfaces a "Re-run drafting in a minute" message; the partially-drafted state is preserved and individual rows can be regenerated.

## Idempotency

- Re-running **extract** clears all child rows for the tender (lots, requirements, docs, criteria, risks) and rewrites them. Drafts are lost intentionally — extraction is the source of truth.
- Re-running **match** updates every requirement's match fields and resets `overridden_by_user` to `false`.
- Re-running **draft** updates `draft_response` in place. Manual edits autosave at 800 ms; a regenerate replaces the manual edit.
- Re-running **risks** deletes and reinserts all risks for the tender.

## Project layout

```
app/
  api/                # All server endpoints (each route owns its zod schema)
  capabilities/       # Global capability matrix page
  login/              # Passcode-gated entry
  tenders/[id]/       # Tender dashboard (3 tabs: Analysis, Capabilities, Export)
  page.tsx            # Tender list + upload
  layout.tsx          # Root layout with fonts + globals
  globals.css         # Design tokens (OKLCH, varied spacing) + base components
components/           # Reusable client components
lib/
  llm/                # Single LLM entry point + schemas
  prompts/            # The four markdown prompts (verbatim, edit-friendly)
  pdf.ts              # pdf-parse loader (avoids module-init crash)
  supabase/           # Server-side Supabase client
  auth.ts             # HMAC-signed session cookie (Edge-compatible)
  types.ts            # DB row shapes shared with the frontend
  docx-builder.ts     # docx export composition
  utils.ts            # tiny formatting helpers
middleware.ts         # Passcode gate
supabase/
  migrations/         # SQL schema (run in order)
  seed.sql            # Optional starter capability rows
PRODUCT.md            # Impeccable design context — user / brand / anti-references
DESIGN.md             # Impeccable design system — OKLCH tokens, typography, spacing
```

## Design

The visual language is editorial-typographic and document-grade. Source Serif 4 carries the hierarchy and document feel; Inter handles dense chrome. Light theme is forced by the user's working scene (bid manager in an office, comparing against a printed PDF). Color is **Restrained**: tinted warm neutrals as canvas, one accent for action and severity.

The full design system is documented in [`DESIGN.md`](./DESIGN.md). The product strategy and anti-references are in [`PRODUCT.md`](./PRODUCT.md). Both are loaded by the `impeccable` design skill (`./.agents/skills/impeccable/`) when iterating.

Banned across the codebase: gradient text, glassmorphism, side-stripe borders, identical card grids, marketing adjectives in UI copy, `#000`/`#fff`, em dashes.

## Accessibility

- All interactive elements reachable by keyboard, including arrow-key navigation on tabs.
- Focus rings everywhere; never `outline: none` without a replacement.
- Color is never the sole channel — status uses dot + label, severity uses label + ordering.
- Live regions: pipeline status announces via `aria-live="polite"`.
- Form fields use proper `<label>` elements, not placeholder-as-label.

## Scripts

```bash
npm run dev         # Dev server on :3000
npm run build       # Production build
npm run start       # Run the built app
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
```

## Notes for the demo

- Scanned-image PDFs are not supported (the upload route rejects empty extracts). OCR would be a follow-on.
- The drafting pipeline is sequential to keep free-tier rate limits well below their ceiling. With a paid model it can be parallelised.
- Auth is a single shared passcode by design — the spec calls for it. Do not deploy this beyond a demo without replacing the auth layer.
- The capability matrix is global. Future work: per-engagement scope, per-customer evidence overrides.
