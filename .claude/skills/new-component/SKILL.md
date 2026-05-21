---
name: new-component
description: Scaffold a new UI component following DESIGN.md and project conventions. Pass the component name and brief description of what it does.
---

Read `DESIGN.md` and `AGENTS.md` before scaffolding.

Create `src/components/<ComponentName>.tsx` with this structure:

```tsx
// No import comments. No "created for X" comments.
import { type ReactNode } from 'react'

type <ComponentName>Props = {
  // typed inline, not interface
}

export function <ComponentName>({ ... }: <ComponentName>Props) {
  return (
    // JSX here
  )
}
```

## Rules to enforce in the scaffold

1. **No `"use client"`** unless the component requires event handlers, browser APIs, or hooks that mandate it. If added, leave a one-line comment with the reason.
2. **No default export** — named export only.
3. **Colors**: only CSS custom properties from DESIGN.md. No raw hex, no Tailwind color classes.
4. **Icons**: `lucide-react` with `strokeWidth={1.5}`. Import only what's used.
5. **No inline styles** — Tailwind utility classes only, using the tokens in `tailwind.config.ts`.
6. **Accessible**: every interactive element reachable by keyboard, every icon-button has `aria-label`.
7. **No modal** — if the component needs to reveal content, use progressive disclosure (expand in-place).
8. **No gradients, no `transition-all`**.
9. **TypeScript strict** — no `any`, explicit return types on non-obvious helpers.

After creating the file, run `/check-design` on it and fix any violations before reporting done.
