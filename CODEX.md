# Codex — Project Rules

Read `AGENTS.md` first. This file extends it with Codex-specific behavior.

`AGENTS.md` is your primary config. This file covers only what differs or needs emphasis for the Codex environment.

---

## Context to load before any task

1. `AGENTS.md` — shared rules (authoritative)
2. `PRODUCT.md` — product purpose and principles
3. `DESIGN.md` — design system (all visual decisions live here)

For feature work, read the relevant `src/lib/` and `src/app/` files before writing anything.

---

## Task scope

Codex tasks in this project fall into three categories:

### 1. Business logic (`src/lib/`)
Extraction, matching, drafting, risk detection, DOCX export.
This is where correctness is most critical. Write tests before implementation.
- Extraction: PDF → structured requirements with exact source quotes
- Matching: requirement vs. capability matrix → coverage status + gap description
- Drafting: evidence-based response text; no fabrication, no marketing language
- Export: DOCX must match the procurement document spec in `DESIGN.md`

### 2. API routes (`src/app/api/`)
Validate all inputs with Zod before any logic. Return structured error responses.
Never expose secrets. Never stream model output directly to the client without validation.

### 3. UI components (`src/components/` and `src/app/`)
Follow `DESIGN.md` exactly. Do not invent tokens or patterns.
Prefer Server Components. Add `"use client"` only when required.

---

## Critical correctness rules

These are not style preferences — they are product correctness requirements:

1. **Never paraphrase a source quote.** The extracted `source_quote` field must be the verbatim string from the PDF.
2. **Never map an ambiguous requirement to `fully_covered`.** Use `partially_covered` or `unclear`.
3. **Confidence scores must reflect model uncertainty.** Do not clamp, round up, or smooth.
4. **Every AI-generated field must be stored as editable.** The bid manager owns the output.
5. **DOCX export must contain no color, no status pills, no AI attribution.** Black text on white, procurement format.

---

## Zod schema conventions

All external data — LLM responses, API request bodies, Supabase query results used in business logic — must pass through a Zod schema.

Name schemas with a `Schema` suffix:
```ts
const RequirementSchema = z.object({ ... })
type Requirement = z.infer<typeof RequirementSchema>
```

Export types from `src/types/`. Keep schemas in `src/lib/schemas/`.

---

## OpenRouter / AI SDK usage

The project uses the `openai` npm package pointed at OpenRouter (OpenAI-compatible API).
Models are configured via environment variables — never hardcoded.

| Env var | Model | Task |
|---------|-------|------|
| `OPENROUTER_MODEL_EXTRACT` | deepseek/deepseek-chat | PDF → requirements |
| `OPENROUTER_MODEL_MATCH` | deepseek/deepseek-chat | requirement vs. capability |
| `OPENROUTER_MODEL_DRAFT` | meta-llama/llama-3.3-70b-instruct | response drafting |
| `OPENROUTER_MODEL_RISK` | deepseek/deepseek-chat | risk detection |

- Base URL must be set to the OpenRouter endpoint, not `api.openai.com`.
- Structured outputs: use `response_format: { type: "json_object" }` — verify OpenRouter model support before using `json_schema` mode.
- Temperature: 0 for extraction and matching. 0.3–0.5 for drafting.
- Required headers: `HTTP-Referer` (`OPENROUTER_HTTP_REFERER`) and `X-Title` (`OPENROUTER_X_TITLE`).
- Never log full prompt contents — tender text is commercially sensitive.

---

## Supabase conventions

- Client-side: anon key only, via `src/lib/supabase/client.ts`.
- Server-side (API routes, Server Components): service role key via `src/lib/supabase/server.ts`.
- RLS must be enabled on every table. Do not bypass RLS in application code.
- Use typed Supabase client generated from the database schema, not raw SQL strings.

---

## What Codex must never generate in this project

- Inline prompt strings — all prompts go in `src/lib/prompts/`
- `any` type — use proper types or Zod inference
- Side stripe borders (`border-l-*`) on any card or row
- Gradient anywhere
- `transition-all` — specify properties explicitly
- Modal dialogs where inline editing would work
- Client-side `useEffect` data fetching
- "Powered by AI" or any AI attribution in UI copy or DOCX output
- Marketing adjectives: "intelligent", "smart", "cutting-edge", "innovative", "seamless"

---

## Testing priorities

Write tests for logic, not for rendering:

| Priority | What to test |
|----------|-------------|
| High | Requirement extraction: correct source quote, correct field mapping |
| High | Coverage matching: status assignment, gap description, confidence |
| High | Drafting: no fabricated evidence, banned words absent |
| High | DOCX export: correct structure, no color, correct footer |
| Medium | API route input validation: Zod errors return 400 |
| Low | UI component snapshot tests |

Use `vitest` (add if not present). Do not test implementation details — test behavior and output.

---

## Commit message format

```
verb noun: short description under 72 chars
```

Examples:
```
add pdf extraction route with zod validation
fix coverage status for partial capability matches
update docx footer to include generation date
```

No capital first letter. No period at end. Imperative verb.
