---
name: check-design
description: Audit a component or file against DESIGN.md tokens and rules. Reports every violation with file:line.
---

Read `DESIGN.md` fully before auditing anything.

Then audit the file or component the user specifies. Check every item below:

## Color
- All colors must use CSS custom properties: `--paper`, `--surface`, `--surface-2`, `--surface-sunk`, `--border`, `--border-strong`, `--ink`, `--ink-2`, `--ink-muted`, `--ink-faint`, `--accent`, `--accent-ink`, `--accent-tint`, `--status-covered`, `--status-partial`, `--status-missing`, `--status-unclear`, `--severity-critical`, `--severity-high`, `--severity-medium`, `--severity-low`
- Flag any raw hex value, `#000`, `#fff`, named color, or Tailwind color class (e.g. `bg-red-500`) that is not mapped to a CSS var
- Status colors appear ONLY as: 6px round dot OR 1-line text tint on a status label. Never full row background. Never `border-l-*` side stripe.
- Accent coverage must stay well under 10% of pixel area

## Typography
- Headings and document content: Source Serif 4
- UI body, chrome, dense lists: Inter with `font-feature-settings: "ss01", "cv11"`
- IDs, timestamps, source locations: JetBrains Mono
- Flag any hardcoded `font-family` that doesn't match these three

## Icons
- Must use `lucide-react` only
- `strokeWidth={1.5}` on every icon — flag any that omit it or use a different value
- 16px in chrome, 20px in headings
- No decorative icons
- No icon-only button without `aria-label` or visible label

## Layout
- No nested cards (requirement = row with hairline divider, not card-in-card)
- No modal where inline editing or progressive disclosure would work
- No `transition-all` — properties must be specified explicitly
- Side panel pushes content, does not overlay

## Motion
- Hover/focus rings: 160ms
- Row expansion: 240ms via `grid-template-rows` 0fr→1fr trick
- Tab/panel changes: 320ms
- No bounce, no spring

## Accessibility
- Every focusable element has a visible focus ring: `2px --accent ring`
- Never `outline: none` without a replacement
- Minimum hit target: 36px
- Color is never the sole information channel (status uses dot + label)
- Form fields have `<label>`, not placeholder-as-label
- Pipeline status uses `aria-live="polite"`

## Anti-patterns (flag immediately if present)
- Any gradient (background, text, border)
- Glassmorphism
- `skeleton` shaped as generic gray rounded block
- Emoji in UI copy
- "AI-speak" in any copy or comment ("I've analyzed", "✨", sparkle icons)
- Marketing adjectives: "world-class", "best-in-class", "cutting-edge", "innovative", "AI-powered", "intelligent", "smart", "seamless", "leverage" (verb)

## Report format
List every violation as:
`[file:line] VIOLATION: <what is wrong> → FIX: <what it should be>`

Then list a summary: X violations found. If zero, confirm "Component is DESIGN.md compliant."
