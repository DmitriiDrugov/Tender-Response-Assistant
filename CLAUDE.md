# Claude Code — Project Rules

Read `AGENTS.md` first. This file extends it with Claude Code-specific behavior.

---

## Context files to read at session start

Always read these before making any changes:

1. `AGENTS.md` — shared rules and conventions
2. `PRODUCT.md` — product purpose, users, principles
3. `DESIGN.md` — design system (tokens, components, motion, accessibility)
4. `CLAUDE_REVIEW.local.md` — local review notes, if present

If the user references a specific feature area (e.g., extraction, matching, export), also read the relevant files in `src/lib/` before touching anything.

---

## Workflow

### Before implementing anything non-trivial
Use the `superpowers:brainstorming` skill before creating features, components, or new behavior. Do not skip it for "simple" tasks — simple things become complex in procurement tools where edge cases (malformed PDFs, ambiguous requirements, missing capabilities) are the norm.

### Before claiming something is done
Use the `superpowers:verification-before-completion` skill. Run `npm run typecheck` and `npm run lint` at minimum. Do not report success without confirming the commands passed.

### Debugging
Use `superpowers:systematic-debugging`. Do not guess and patch. Procurement data integrity bugs (wrong match status, missing source quote) are worse than a build error.

### When implementing features
Use `superpowers:test-driven-development` for business logic in `src/lib/`. UI components are harder to TDD — focus test coverage on the extraction, matching, and drafting logic where correctness is critical.

---

## Allowed operations (no confirmation needed)

- Reading any file in the repo
- Running `npm run typecheck`, `npm run lint`, `npm run build`, `npm run dev`
- Editing files in `src/`, `DESIGN.md`, `PRODUCT.md`, `AGENTS.md`, `CLAUDE.md`, `CODEX.md`
- Writing new files inside `src/`

## Requires confirmation before proceeding

- Deleting any file
- Modifying `package.json` dependencies
- Modifying `tailwind.config.ts` or `tsconfig.json`
- Any change to Supabase schema or RLS policies
- Pushing to remote or creating PRs
- Any operation touching `.env.local`

---

## Design system enforcement

Claude Code must not invent design tokens. Before writing any color value, spacing value, or component structure, verify it appears in `DESIGN.md`. If a pattern is missing from `DESIGN.md`, raise it with the user rather than inventing one.

Specific checks:
- Color: must use `--paper`, `--ink`, `--accent`, `--status-*`, `--severity-*` or their listed variants. No raw hex.
- Status colors: dot + label only. Never full row background, never side stripe.
- Icons: `lucide-react`, `strokeWidth={1.5}`, 16px chrome / 20px headings.
- Fonts: Source Serif 4 (headings/document), Inter (UI body), JetBrains Mono (IDs/timestamps/locations).

---

## AI pipeline specifics

When working on any LLM-facing code:

- Prompt strings go in `src/lib/prompts/`. Never inline.
- Structure prompts so the model returns structured JSON validated by a Zod schema.
- The pipeline status displayed in the UI is: `Extracting requirements.` → `Matching against capabilities.` → `Drafting N of M responses.` → `Identifying risks.` → `Ready.` — match this copy exactly.
- The "thinking" indicator is a 1px ink-stroke animation, not a spinner. See `DESIGN.md` motion spec.

---

## Things Claude Code must never do in this project

- Add `"use client"` to a component that doesn't need it
- Fetch data in a client component with `useEffect`
- Use `any` or `@ts-ignore`
- Add a `border-l-*` side stripe to any card or row (explicitly banned in `DESIGN.md`)
- Add gradient to anything
- Add emoji to UI copy or component output
- Write multi-paragraph docstrings or comment blocks explaining what the code does
- Create a modal where inline editing or progressive disclosure would work
- Paraphrase a source PDF quote in any UI element — display verbatim or not at all

---

## Response style

- Terse. One sentence of context, then the action.
- No trailing summaries ("I've updated X and Y and Z"). The diff speaks.
- File references as clickable markdown links: `[src/lib/extraction.ts](src/lib/extraction.ts)`.
- Line references: `[extraction.ts:42](src/lib/extraction.ts#L42)`.
