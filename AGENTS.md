# Tender Response Assistant — Agent Rules

Shared rules for every agent (Claude, Codex, or any future automated contributor).
Both `CLAUDE.md` and `CODEX.md` extend this file; read this first.

---

## Project in one sentence

An internal triage-and-drafting tool for bid managers responding to public tenders.
It extracts requirements from a PDF, matches them against a capability matrix, drafts responses, surfaces risks, and exports a DOCX. It is not a chatbot.

---

## Authoritative references

Read these before touching any feature area:

| File | What it governs |
|------|----------------|
| `PRODUCT.md` | Purpose, users, tone, strategic principles, anti-references |
| `DESIGN.md` | Full design system: color tokens, typography, spacing, component specs, motion, accessibility |

Never invent design decisions. If `DESIGN.md` specifies a token, use it. If a pattern is not in `DESIGN.md`, ask before adding it.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 App Router (TypeScript strict) |
| Styling | Tailwind CSS v3 with custom tokens from `DESIGN.md` |
| Database | Supabase (Postgres + Row Level Security) |
| AI SDK | `openai` npm package (used as the API client) |
| Validation | Zod |
| PDF parsing | `pdf-parse` |
| DOCX export | `docx` |
| Icons | `lucide-react` (16px chrome, 20px headings, `strokeWidth={1.5}`) |
| Utilities | `clsx`, `tailwind-merge` |

---

## Repository layout

```
src/
  app/           Next.js App Router pages and API routes
  components/    Shared UI components
  lib/           Business logic, AI calls, Supabase client, types
  types/         Shared TypeScript types (no logic)
```

Follow this layout. Do not create new top-level directories without a documented reason.

---

## Code rules

### TypeScript
- Strict mode is on. No `any`, no `as unknown`, no `@ts-ignore`.
- Use Zod for all external data boundaries (API responses, form inputs, PDF extraction output).
- Prefer `type` over `interface` for data shapes; use `interface` only for extendable contracts.
- Export types from `src/types/`; keep component-private types in the component file.

### React / Next.js
- Use Server Components by default. Add `"use client"` only when required (event handlers, browser APIs, hooks that require it).
- Fetch data in Server Components or Route Handlers. No client-side `useEffect` data fetching.
- API routes live in `src/app/api/`. Validate request bodies with Zod before any business logic.
- Never expose Supabase service role key to the client. Use the anon key on the client side.

### Styling
- Use the CSS custom properties defined in `DESIGN.md` for all color. Never raw hex, `#000`, or `#fff`.
- Status colors appear only as the 6px dot and/or text label — never as full row backgrounds or side stripes.
- No gradients, no glassmorphism, no `transition-all` (specify properties explicitly).
- Motion timings from `DESIGN.md`: 160ms hover, 240ms row expand, 320ms panel.

### Components
- No nested cards. Requirement items are rows with hairline dividers.
- Inline editing and progressive disclosure; avoid modals.
- Minimum interactive hit target: 36px.
- Every icon-adjacent button needs an accessible name (`aria-label` or visible label).
- Focus visible: 2px `--accent` ring on every focusable element. Never `outline: none` without a replacement.

### AI / LLM calls
- All prompts live in `src/lib/prompts/`. Never inline prompt strings in components or route handlers.
- Every LLM response passes through a Zod schema before being stored or displayed.
- Confidence scores are the model's certainty, not a marketing tool. Never inflate or hide them.
- "Unclear" and "not_covered" are valid first-class statuses. Do not silently collapse them.

---

## Product principles (enforce in code)

1. **Reviewer-in-the-loop.** Every AI-generated field must be editable and overridable by the user.
2. **Source excerpts are sacred.** Display the PDF quote verbatim. Never paraphrase it in the UI.
3. **Honest classification.** Do not default uncertain matches to "fully_covered". Surface the gap.
4. **Density is a feature.** Do not pad components with unnecessary whitespace. The user scans 200+ requirements.
5. **Export looks like a procurement document.** See the DOCX spec in `DESIGN.md`.

---

## Copy and tone

- UI copy: formal, third-person procurement register. No exclamation marks. No marketing adjectives.
- Banned words in both UI copy and AI-drafted responses: "world-class", "best-in-class", "cutting-edge", "innovative", "AI-powered", "intelligent", "smart", "seamless", "leverage" (as a verb).
- Status and error messages are factual and tell the user what to do next.
- No AI-speak in the UI: no "I've analyzed...", no sparkle icons, no "✨ AI" badges.

---

## What not to build

- No chat interface.
- No "Powered by AI" footer or any AI attribution visible to end users.
- No social affordances (share, favorite, comment).
- No dark mode — the design is light-only.
- No skeleton screens with generic gray rounded blocks; show the real structure with placeholder text.

---

## Commits and PRs

- Commit messages: imperative, lowercase verb, under 72 chars. `add requirement extraction route`, not `Added the new API endpoint for extraction`.
- One logical change per commit. Do not bundle unrelated fixes.
- PRs include: what changed, why, how to test. No "misc fixes" PRs.

---

## Environment variables

All secrets live in `.env.local` (never committed). The `.env.local.example` documents every required key.
Before adding a new env var, add it to `.env.local.example` with a placeholder value and a one-line comment.
