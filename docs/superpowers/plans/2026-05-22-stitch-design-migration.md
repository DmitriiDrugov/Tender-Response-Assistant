# Stitch Design Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current design system with the Stitch "Tender Ledger" design across all 28 UI files.

**Architecture:** Material Design 3 colour tokens replace the existing OKLCH CSS variables; Public Sans replaces Inter; a fixed left sidebar replaces the top header Shell; Material Symbols Outlined icons replace Lucide React throughout.

**Tech Stack:** Next.js App Router, Tailwind CSS v3, `next/font/google`, Material Symbols Outlined (Google Fonts CDN), TypeScript.

---

## Token Quick-Reference

### Tailwind class substitution table

| Old class | New class |
|---|---|
| `text-ink` | `text-on-surface` |
| `text-ink-2` | `text-on-surface-variant` |
| `text-ink-muted` | `text-on-surface-variant` |
| `text-ink-faint` | `text-outline` |
| `text-accent` | `text-error` (errors) / `text-primary` (CTAs) |
| `text-accent-ink` | `text-primary` |
| `bg-paper` | `bg-background` |
| `bg-surface` | `bg-surface` |
| `bg-surface-2` | `bg-surface-container` |
| `bg-surface-sunk` | `bg-surface-container-low` |
| `border-border` | `border-outline-variant` |
| `border-border-strong` | `border-outline` |
| `font-serif text-31` | `font-headline-lg text-headline-lg` |
| `font-serif text-25` | `font-headline-md text-headline-md` |
| `font-serif text-20` | `font-headline-sm text-headline-sm` |
| `font-mono text-13` | `font-data-md text-data-md` |

### CSS variable substitution (for inline `style={}` props)

| Old variable | New value |
|---|---|
| `var(--status-covered)` | `#705d00` |
| `var(--status-partial)` | `#e9c400` |
| `var(--status-missing)` | `#ba1a1a` |
| `var(--status-unclear)` | `#7e775f` |
| `var(--severity-critical)` | `#ba1a1a` |
| `var(--severity-high)` | `#93000a` |
| `var(--severity-medium)` | `#7e775f` |
| `var(--severity-low)` | `#4d4732` |
| `var(--ink-faint)` | `#7e775f` |
| `var(--border-strong)` | `#d0c6ab` |

### Icon replacement (Lucide → Material Symbols)

Replace every Lucide import with a `<span className="material-symbols-outlined">{name}</span>`.

| Lucide component | Material Symbol name |
|---|---|
| `<ArrowLeft />` | `arrow_back` |
| `<ChevronRight />` | `arrow_outward` |
| `<Trash2 />` | `delete` |
| `<AlertTriangle />` | `warning` |
| `<Upload />` | `upload_file` |

---

## Task 1: Design Tokens, Fonts, Base Styles

> ⚠️ `tailwind.config.ts` requires user confirmation per CLAUDE.md before committing.

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary":                  "#705d00",
        "primary-container":        "#ffd700",
        "primary-fixed":            "#ffe16d",
        "primary-fixed-dim":        "#e9c400",
        "on-primary":               "#ffffff",
        "on-primary-container":     "#705e00",
        "on-primary-fixed":         "#221b00",
        "on-primary-fixed-variant": "#544600",
        "background":               "#fbf9f8",
        "surface":                  "#fbf9f8",
        "surface-bright":           "#fbf9f8",
        "surface-dim":              "#dcd9d9",
        "surface-variant":          "#e4e2e1",
        "surface-container":        "#f0eded",
        "surface-container-low":    "#f6f3f2",
        "surface-container-high":   "#eae8e7",
        "surface-container-highest":"#e4e2e1",
        "surface-container-lowest": "#ffffff",
        "on-surface":               "#1b1c1c",
        "on-surface-variant":       "#4d4732",
        "on-background":            "#1b1c1c",
        "secondary":                "#5f5e5e",
        "secondary-container":      "#e4e2e1",
        "on-secondary":             "#ffffff",
        "tertiary":                 "#5d5f5f",
        "tertiary-container":       "#d9dada",
        "on-tertiary":              "#ffffff",
        "outline":                  "#7e775f",
        "outline-variant":          "#d0c6ab",
        "error":                    "#ba1a1a",
        "error-container":          "#ffdad6",
        "on-error":                 "#ffffff",
        "on-error-container":       "#93000a",
        "inverse-surface":          "#303030",
        "inverse-on-surface":       "#f3f0f0",
        "inverse-primary":          "#e9c400",
      },
      fontFamily: {
        "headline-lg":      ['"Source Serif 4"', "Georgia", "serif"],
        "headline-md":      ['"Source Serif 4"', "Georgia", "serif"],
        "headline-sm":      ['"Source Serif 4"', "Georgia", "serif"],
        "body-lg":          ['"Public Sans"', "system-ui", "sans-serif"],
        "body-md":          ['"Public Sans"', "system-ui", "sans-serif"],
        "label-md":         ['"Public Sans"', "system-ui", "sans-serif"],
        "label-mono":       ['"JetBrains Mono"', "ui-monospace", "monospace"],
        "data-md":          ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "headline-lg": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg":     ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-md":     ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-md":    ["12px", { lineHeight: "1",   fontWeight: "700",  letterSpacing: "0.05em" }],
        "label-mono":  ["11px", { lineHeight: "1",   fontWeight: "500",  letterSpacing: "0.02em" }],
        "data-md":     ["13px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      keyframes: {
        "ink-stroke": {
          "0%":   { strokeDashoffset: "120" },
          "60%":  { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "-120" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
      animation: {
        "ink-stroke": "ink-stroke 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) infinite",
        "fade-in":    "fade-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Replace `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Status colours used in inline style= props */
    --status-covered:  #705d00;
    --status-partial:  #e9c400;
    --status-missing:  #ba1a1a;
    --status-unclear:  #7e775f;

    /* Severity colours used in inline style= props */
    --severity-critical: #ba1a1a;
    --severity-high:     #93000a;
    --severity-medium:   #7e775f;
    --severity-low:      #4d4732;
  }

  html, body {
    background: #fbf9f8;
    color: #1b1c1c;
    font-family: "Public Sans", system-ui, sans-serif;
    font-size: 0.875rem;
    line-height: 1.35rem;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    min-height: 100vh;
  }

  *::selection {
    background: #ffd700;
    color: #1b1c1c;
  }

  *:focus-visible {
    outline: 2px solid #705d00;
    outline-offset: 2px;
    border-radius: 2px;
  }

  input, textarea, select, button {
    color: inherit;
    font: inherit;
  }
}

@layer components {
  .industrial-border {
    border: 1px solid #7e775f;
  }

  .heavy-border {
    border: 2px solid #1b1c1c;
  }

  .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    vertical-align: middle;
    line-height: 1;
    font-size: 1.25rem;
  }

  /* The "ink stroke" thinking indicator — 1px animated SVG path */
  .ink-stroke {
    width: 1.5rem;
    height: 0.5rem;
    overflow: visible;
  }
  .ink-stroke path {
    stroke: #4d4732;
    stroke-width: 1.25;
    fill: none;
    stroke-dasharray: 24;
    animation: ink-stroke 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
  }
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb {
  background: #d0c6ab;
  border: 2px solid #fbf9f8;
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover { background: #7e775f; }
::-webkit-scrollbar-track { background: #fbf9f8; }
```

- [ ] **Step 3: Update `app/layout.tsx`** — replace Inter with Public Sans, add Material Symbols CDN link

```tsx
import type { Metadata } from "next";
import { Public_Sans, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tender Response Assistant",
  description: "Triage, draft, and review responses to public tenders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```
npm run typecheck
```

Expected: no errors (CSS class changes don't affect TypeScript).

- [ ] **Step 5: Commit** (requires user confirmation for tailwind.config.ts)

```bash
git add tailwind.config.ts app/globals.css app/layout.tsx
git commit -m "feat: replace design tokens with Stitch Material Design 3 palette"
```

---

## Task 2: Sidebar Layout

**Files:**
- Create: `components/Sidebar.tsx`
- Modify: `components/Shell.tsx` (becomes thin re-export for backwards-compat, then each page is updated)
- Modify: `app/page.tsx`
- Modify: `app/tenders/[id]/page.tsx`
- Modify: `app/capabilities/page.tsx`
- Modify: `app/logs/page.tsx`
- Modify: `components/LogoutButton.tsx`

- [ ] **Step 1: Create `components/Sidebar.tsx`**

```tsx
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-high border-r border-outline-variant/30 flex flex-col py-8 z-50">
      <div className="px-6 mb-10">
        <h2 className="font-headline-md text-headline-md text-primary">Tender Response</h2>
        <p className="font-label-mono text-label-mono text-on-surface-variant mt-0.5">
          Procurement Triage
        </p>
      </div>

      <nav className="flex-1 px-3 space-y-1" aria-label="Main navigation">
        <NavLink href="/" icon="description" label="Tenders" />
        <NavLink href="/capabilities" icon="assignment_turned_in" label="Capabilities" />
        <NavLink href="/logs" icon="receipt_long" label="Logs" />
      </nav>

      <div className="mt-auto px-3 border-t border-outline-variant/30 pt-6">
        <div className="flex items-center gap-3 px-3 mb-4">
          <div className="w-8 h-8 rounded bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-xs flex-shrink-0">
            TL
          </div>
          <div className="min-w-0">
            <p className="font-label-md text-label-md text-on-surface truncate">Tender Lead</p>
            <p className="font-label-mono text-label-mono text-on-surface-variant opacity-60 truncate">
              Procurement
            </p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-3 text-on-surface-variant hover:bg-surface-variant/50 transition-colors duration-200 rounded"
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span className="font-label-mono text-label-mono">{label}</span>
    </Link>
  );
}
```

- [ ] **Step 2: Update `components/LogoutButton.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        start(async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace("/login");
          router.refresh();
        });
      }}
      disabled={isPending}
      className="flex items-center gap-3 w-full px-3 py-3 text-on-surface-variant hover:bg-surface-variant/50 transition-colors duration-200 rounded"
    >
      <span className="material-symbols-outlined">logout</span>
      <span className="font-label-mono text-label-mono">
        {isPending ? "Signing out…" : "Logout"}
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Replace `components/Shell.tsx`** with a wrapper that uses Sidebar

```tsx
import { Sidebar } from "./Sidebar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/Sidebar.tsx components/Shell.tsx components/LogoutButton.tsx
git commit -m "feat: replace Shell header with Sidebar navigation"
```

---

## Task 3: Login Page

**Files:**
- Modify: `app/login/LoginForm.tsx`
- Modify: `app/login/page.tsx`

- [ ] **Step 1: Replace `app/login/LoginForm.tsx`**

Note: The current app uses a single passcode field. The Stitch design is adapted to show a single "Passcode" field with the industrial login visual.

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || "Invalid credentials. Please verify your entry.");
        return;
      }
      startTransition(() => {
        router.replace(from || "/");
        router.refresh();
      });
    } catch {
      setError("Network error. Try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="passcode"
          className="font-label-mono text-label-mono text-on-surface-variant uppercase block"
        >
          Passcode
        </label>
        <input
          id="passcode"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full industrial-border bg-surface-container-lowest px-4 py-3 font-body-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-150 rounded-none placeholder:text-outline"
          placeholder="••••••••"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "passcode-error" : undefined}
        />
      </div>

      {error ? (
        <div
          id="passcode-error"
          role="alert"
          className="flex items-center gap-2 p-3 bg-error-container text-on-error-container industrial-border"
        >
          <span className="material-symbols-outlined text-[18px]">error_outline</span>
          <span className="font-body-md text-body-md">{error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !passcode}
        className="w-full bg-primary text-on-primary hover:brightness-110 font-label-mono text-label-mono uppercase tracking-widest py-4 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <span className="material-symbols-outlined text-[18px] animate-spin">
              progress_activity
            </span>
            Processing…
          </>
        ) : (
          <>
            Sign in
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </>
        )}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Replace `app/login/page.tsx`**

```tsx
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-surface"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(27,28,28,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(27,28,28,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      {/* Decorative corner text — hidden on mobile */}
      <div className="fixed top-8 left-8 hidden lg:block">
        <p className="font-label-mono text-[11px] text-on-surface-variant/30 uppercase leading-relaxed"
           style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          Procurement Protocol v4.2.1 // Triage Engine // Secure Layer
        </p>
      </div>
      <div className="fixed bottom-8 right-8 hidden lg:block text-right">
        <p className="font-label-mono text-[11px] text-on-surface-variant/30 uppercase leading-relaxed">
          Est. 1994 Document Systems<br />
          Unauthorized access prohibited
        </p>
      </div>

      {/* Login panel */}
      <main className="w-full max-w-[440px] bg-surface industrial-border p-10 md:p-12 relative overflow-hidden">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary" />

        <header className="mb-10 text-center">
          <div className="flex justify-center mb-6">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: "40px" }}>
              description
            </span>
          </div>
          <h1 className="font-headline-md text-headline-md text-primary mb-2 tracking-tight">
            Tender Response Assistant
          </h1>
          <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">
            Sign in to continue
          </p>
        </header>

        <Suspense>
          <LoginForm />
        </Suspense>

        <footer className="mt-12 pt-8 border-t border-on-surface/5 flex justify-center gap-6">
          <span className="font-label-mono text-label-mono text-on-surface-variant/60 uppercase">
            Security Policy
          </span>
          <span className="text-on-surface-variant/20">•</span>
          <span className="font-label-mono text-label-mono text-on-surface-variant/60 uppercase">
            System Status
          </span>
        </footer>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/login/LoginForm.tsx app/login/page.tsx
git commit -m "feat: redesign login page with industrial Stitch aesthetic"
```

---

## Task 4: Tenders List

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/TenderListClient.tsx`
- Modify: `components/UploadCard.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import { Shell } from "@/components/Shell";
import { TenderListClient } from "@/components/TenderListClient";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Shell>
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant/30 px-10 py-4">
          <h1 className="font-headline-md text-headline-md text-primary">
            Tender Response Assistant
          </h1>
        </header>
        <main className="flex-1 w-full max-w-5xl mx-auto px-10 py-12">
          <section className="mb-12">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">Tenders</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
              Upload a tender PDF. Requirements are extracted, matched against your capability
              matrix, drafted, and screened for risk. You review the result.
            </p>
          </section>
          <TenderListClient />
        </main>
      </div>
    </Shell>
  );
}
```

- [ ] **Step 2: Replace `components/UploadCard.tsx`**

```tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function UploadCard({ onUploaded }: { onUploaded: (tenderId: string) => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > 25 * 1024 * 1024) { setError("File exceeds 25 MB."); return; }
      if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Only PDF files are accepted."); return; }
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/tenders/upload", { method: "POST", body: form });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error || "Upload failed.");
          setUploading(false);
          return;
        }
        const data = (await res.json()) as { id: string };
        onUploaded(data.id);
        router.refresh();
      } catch {
        setError("Network error during upload.");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, router],
  );

  return (
    <section className="mb-16">
      <input
        ref={inputRef}
        id="tender-pdf-input"
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
      />
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void onFile(f);
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload tender PDF"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        className={[
          "h-64 flex flex-col items-center justify-center p-8 cursor-pointer transition-all",
          isDragging ? "bg-surface-container-low" : "bg-surface-container-lowest hover:bg-surface",
        ].join(" ")}
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%237e775f' stroke-width='2' stroke-dasharray='8%2c 12' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e\")",
        }}
      >
        <span
          className="material-symbols-outlined text-outline mb-4 transition-transform group-hover:scale-110"
          style={{ fontSize: "2.5rem" }}
        >
          upload_file
        </span>
        <p className="font-label-md text-label-md text-on-surface-variant mb-6 text-center">
          {isUploading
            ? "UPLOADING AND PARSING THE PDF…"
            : "DRAG AND DROP A TENDER PDF OR CLICK TO BROWSE"}
        </p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          disabled={isUploading}
          className="bg-primary-container text-on-primary-container px-8 py-3 font-label-md text-label-md heavy-border hover:shadow-[4px_4px_0px_0px_#333] transition-all active:scale-95 disabled:opacity-50"
        >
          UPLOAD PDF
        </button>
      </div>
      {error ? (
        <p className="mt-2 font-body-md text-body-md text-error" role="alert">{error}</p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 3: Replace `components/TenderListClient.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UploadCard } from "./UploadCard";
import { formatDate, formatRelativeTime, daysUntil, pct } from "@/lib/utils";
import type { PipelineStatus } from "@/lib/types";
import { PipelineProgress, type PipelineState } from "./PipelineProgress";

type Coverage = {
  total: number;
  covered: number;
  partial: number;
  missing: number;
  unclear: number;
};

type TenderRow = PipelineState & {
  id: string;
  title: string;
  issuing_authority: string | null;
  submission_deadline: string | null;
  created_at: string;
  updated_at: string;
  coverage?: Coverage;
};

function isPipelineActive(t: TenderRow): boolean {
  return (
    t.extraction_status === "running" ||
    t.matching_status === "running" ||
    t.drafting_status === "running" ||
    t.risks_status === "running"
  );
}

function deadlineLabel(iso: string | null): { text: string; tone: "default" | "soon" | "overdue" } {
  if (!iso) return { text: "No deadline", tone: "default" };
  const days = daysUntil(iso);
  const base = formatDate(iso);
  if (days == null) return { text: base, tone: "default" };
  if (days < 0) return { text: `${base} (Overdue)`, tone: "overdue" };
  if (days <= 14) return { text: `${base} (${days} d)`, tone: "soon" };
  return { text: `${base} (${days} d)`, tone: "default" };
}

export function TenderListClient() {
  const [tenders, setTenders] = useState<TenderRow[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tenders", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { tenders: TenderRow[] };
      setTenders(data.tenders);
    } catch { /* polling will retry */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const anyActive = (tenders ?? []).some(isPipelineActive);
    if (!anyActive) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (!pollRef.current) {
      pollRef.current = setInterval(() => { void load(); }, 2000);
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [tenders, load]);

  const onUploaded = useCallback(async (id: string) => {
    setActiveId(id);
    await load();
    void runPipeline(id, load);
  }, [load]);

  const onDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this tender and all derived data?")) return;
    const res = await fetch(`/api/tenders/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }, [load]);

  return (
    <div>
      <UploadCard onUploaded={onUploaded} />

      <section>
        <div className="flex items-end justify-between mb-6 border-b-2 border-on-surface pb-2">
          <div className="flex items-center gap-2">
            <span className="font-label-md text-label-md text-on-surface">PAST TENDERS</span>
            {tenders != null && (
              <span className="bg-on-surface text-surface px-2 py-0.5 font-label-mono text-label-mono">
                {tenders.length}
              </span>
            )}
          </div>
        </div>

        {tenders == null ? (
          <p className="font-body-md text-body-md text-on-surface-variant py-4">Loading.</p>
        ) : tenders.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant py-4 max-w-2xl">
            No tenders yet. Upload a PDF above to begin.
          </p>
        ) : (
          <div className="space-y-4">
            {tenders.map((t) => (
              <TenderRowCard
                key={t.id}
                tender={t}
                emphasised={t.id === activeId}
                onDelete={() => void onDelete(t.id)}
              />
            ))}
          </div>
        )}
      </section>

      {tenders && tenders.length > 0 && (
        <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-px bg-outline industrial-border">
          <StatCard label="Total Value Scanned" value="—" />
          <StatCard label="Drafting Efficiency" value="—" note="Avg time saved per response" />
          <StatCard label="Matrix Health" value="Active" note="Capability data loaded" />
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-surface-container p-6">
      <p className="font-label-mono text-[10px] uppercase mb-2 text-on-surface-variant/60">{label}</p>
      <p className="font-headline-md text-headline-md text-on-surface">{value}</p>
      {note && <p className="text-[10px] font-label-mono text-on-surface-variant/60 mt-2 uppercase">{note}</p>}
    </div>
  );
}

function CoverageBar({ c }: { c: Coverage }) {
  if (c.total === 0) return null;
  const seg = (n: number) => `${(n / c.total) * 100}%`;
  return (
    <div className="space-y-2">
      <p className="font-label-md text-label-md text-on-surface-variant">CAPABILITY COVERAGE</p>
      <div
        className="flex h-3 w-full industrial-border overflow-hidden"
        role="img"
        aria-label={`Coverage: ${c.covered} covered, ${c.partial} partial, ${c.missing} missing, ${c.unclear} unclear.`}
      >
        <span style={{ width: seg(c.covered), background: "#705d00" }} />
        <span style={{ width: seg(c.partial), background: "#e9c400" }} />
        <span style={{ width: seg(c.missing), background: "#e4e2e1" }} />
        <span style={{ width: seg(c.unclear), background: "#ba1a1a" }} />
      </div>
      <div className="flex justify-between font-label-mono text-[10px] text-on-surface-variant/60">
        <span>{c.covered} Covered</span>
        <span>{c.missing} Missing</span>
      </div>
    </div>
  );
}

function TenderRowCard({
  tender,
  emphasised,
  onDelete,
}: {
  tender: TenderRow;
  emphasised: boolean;
  onDelete: () => void;
}) {
  const dl = deadlineLabel(tender.submission_deadline);
  const active = isPipelineActive(tender);
  const coverage = tender.coverage;
  const pctCovered =
    coverage && coverage.total > 0 ? pct(coverage.covered, coverage.total) : null;

  return (
    <div
      className={[
        "industrial-border p-6 transition-colors",
        emphasised ? "bg-surface-container-lowest" : "bg-surface-container-low hover:bg-surface-container-lowest",
      ].join(" ")}
    >
      <div className="grid grid-cols-12 gap-6 items-center">
        {/* Col 1–5: Info */}
        <div className="col-span-5">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/tenders/${tender.id}`}
              className="font-headline-sm text-headline-sm text-primary hover:underline"
            >
              {tender.title}
            </Link>
            <span className="material-symbols-outlined text-sm text-on-surface-variant">
              arrow_outward
            </span>
          </div>
          <div className="space-y-1">
            {tender.issuing_authority && (
              <p className="font-label-mono text-label-mono text-on-surface-variant/70 uppercase">
                {tender.issuing_authority}
              </p>
            )}
            <div className="flex items-center gap-3">
              <p
                className={[
                  "font-label-mono text-label-mono uppercase",
                  dl.tone === "overdue"
                    ? "text-error font-bold"
                    : dl.tone === "soon"
                    ? "text-primary"
                    : "text-on-surface-variant/80",
                ].join(" ")}
              >
                Deadline: {dl.text}
              </p>
              <span className="w-1 h-1 bg-outline rounded-full" />
              <p className="font-label-mono text-label-mono text-on-surface-variant/60">
                Updated {formatRelativeTime(tender.updated_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Col 6–9: Coverage */}
        <div className="col-span-4">
          {coverage && coverage.total > 0 ? (
            <CoverageBar c={coverage} />
          ) : (
            <p className="font-label-mono text-label-mono text-on-surface-variant/60">
              No coverage yet.
            </p>
          )}
        </div>

        {/* Col 10–12: Score + Delete */}
        <div className="col-span-3 flex items-center justify-end gap-6">
          {pctCovered != null && (
            <div className="text-right">
              <p className="font-label-mono text-[10px] text-on-surface-variant/60">MATCH</p>
              <p className="font-headline-md text-headline-md text-on-surface leading-none">
                {pctCovered}%
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete tender ${tender.title}`}
            className="industrial-border p-2 text-on-surface-variant hover:bg-error hover:text-on-error transition-colors"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      {active && (
        <div className="mt-6 pt-4 border-t border-outline-variant/30">
          <PipelineProgress state={tender} />
        </div>
      )}
    </div>
  );
}

async function runPipeline(id: string, refresh: () => Promise<void>) {
  try {
    const extractRes = await fetch(`/api/tenders/${id}/extract`, { method: "POST" });
    await refresh();
    if (!extractRes.ok) return;
    const matchRes = await fetch(`/api/tenders/${id}/match`, { method: "POST" });
    await refresh();
    if (!matchRes.ok) return;
    const risksRes = await fetch(`/api/tenders/${id}/risks`, { method: "POST" });
    await refresh();
    if (!risksRes.ok) return;
    await fetch(`/api/tenders/${id}/draft`, { method: "POST" });
    await refresh();
  } catch { /* errors reflected in status */ }
}
```

- [ ] **Step 4: Run typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/UploadCard.tsx components/TenderListClient.tsx
git commit -m "feat: redesign tenders list with Stitch industrial aesthetic"
```

---

## Task 5: Dashboard Shell

**Files:**
- Modify: `components/TenderHeader.tsx`
- Modify: `components/Tabs.tsx`
- Modify: `components/PipelineProgressBanner.tsx`
- Modify: `components/RedFlagBanner.tsx`
- Modify: `components/TenderDashboard.tsx`
- Modify: `app/tenders/[id]/page.tsx`

- [ ] **Step 1: Replace `components/TenderHeader.tsx`**

```tsx
"use client";

import Link from "next/link";
import type { TenderFull } from "@/lib/types";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";

export function TenderHeader({ tender }: { tender: TenderFull }) {
  const dl = tender.submission_deadline;
  const dDays = daysUntil(dl);
  const deadlineUrgent = dDays != null && dDays < 0;

  return (
    <div className="space-y-0">
      {/* Row 1: nav + title + actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="font-label-md text-label-md uppercase">Back to Tenders</span>
          </Link>
          <span className="text-outline-variant flex-shrink-0">/</span>
          <h2 className="font-headline-md text-headline-md text-primary truncate">
            {tender.title}
          </h2>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="relative hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search project data…"
              className="bg-surface-container-low industrial-border pl-9 pr-4 py-2 font-body-md text-on-surface w-56 focus:outline-none focus:ring-1 focus:ring-primary rounded-none placeholder:text-outline"
            />
          </div>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </div>

      {/* Row 2: metadata grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 industrial-border bg-surface-container-lowest divide-x divide-outline-variant mt-4">
        {tender.issuing_authority && (
          <MetaCell label="Authority" value={tender.issuing_authority} />
        )}
        {tender.tender_id_external && (
          <MetaCell label="Tender ID" value={tender.tender_id_external} mono />
        )}
        <div className="p-4">
          <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">
            Deadline
          </p>
          <p
            className={[
              "font-data-md text-data-md",
              deadlineUrgent ? "text-error font-bold italic" : "text-on-surface",
            ].join(" ")}
          >
            {formatDate(dl)}
            {dDays != null
              ? dDays < 0
                ? ` (${Math.abs(dDays)} days overdue)`
                : ` (${dDays} days left)`
              : ""}
          </p>
        </div>
        {tender.estimated_value_amount != null && (
          <MetaCell
            label="Estimated Value"
            value={formatCurrency(tender.estimated_value_amount, tender.estimated_value_currency)}
            mono
          />
        )}
      </div>
    </div>
  );
}

function MetaCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="p-4">
      <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">{label}</p>
      <p className={mono ? "font-data-md text-data-md text-on-surface" : "font-body-md text-body-md text-on-surface"}>
        {value}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Replace `components/Tabs.tsx`**

```tsx
"use client";

import { useId } from "react";

export type TabSpec = { key: string; label: string; count?: number; badge?: number };

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabSpec[];
  active: string;
  onChange: (key: string) => void;
}) {
  const groupId = useId();

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const idx = tabs.findIndex((t) => t.key === active);
    if (idx < 0) return;
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    const t = tabs[next];
    if (t) onChange(t.key);
  }

  return (
    <div
      role="tablist"
      aria-label="Tender views"
      onKeyDown={onKeyDown}
      className="flex gap-8 overflow-x-auto border-b border-outline-variant/30 pt-2"
      style={{ scrollbarWidth: "none" }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            id={`${groupId}-tab-${t.key}`}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(t.key)}
            className={[
              "relative pb-2 -mb-px flex items-center gap-2 font-body-md text-body-md whitespace-nowrap transition-colors",
              isActive
                ? "text-primary font-bold border-b-2 border-primary"
                : "text-on-surface-variant hover:text-primary",
            ].join(" ")}
          >
            <span>{t.label}</span>
            {t.badge != null && t.badge > 0 ? (
              <span className="bg-error text-on-error px-1.5 py-0.5 text-[10px] font-bold rounded-none">
                {t.badge}
              </span>
            ) : t.count != null ? (
              <span className="text-[10px] text-on-surface-variant/60">{t.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Replace `components/PipelineProgressBanner.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { TenderFull } from "@/lib/types";
import { InkStroke } from "./InkStroke";

type StepState = "complete" | "active" | "pending";
type Step = { label: string; state: StepState };

function derivePipelineSteps(tender: TenderFull): Step[] {
  const { matching_status, risks_status, drafting_status } = tender;
  const done = tender.drafting_progress_done;
  const total = tender.drafting_progress_total;

  const matchState: StepState =
    matching_status === "complete" ? "complete"
    : matching_status === "running" ? "active"
    : "pending";

  const risksState: StepState =
    risks_status === "complete" ? "complete"
    : risks_status === "running" ? "active"
    : "pending";

  const draftState: StepState =
    drafting_status === "complete" ? "complete"
    : drafting_status === "running" ? "active"
    : "pending";

  const draftLabel =
    draftState === "active" && total > 0
      ? `Drafting ${done} of ${total} responses.`
      : "Drafting responses.";

  const allDone =
    matching_status === "complete" &&
    risks_status === "complete" &&
    drafting_status === "complete";

  return [
    { label: "Extracting requirements.", state: "complete" },
    { label: "Matching against capabilities.", state: matchState },
    { label: draftLabel, state: draftState },
    { label: "Identifying risks.", state: risksState },
    { label: "Ready.", state: allDone ? "complete" : "pending" },
  ];
}

function hasPendingWork(tender: TenderFull): boolean {
  return (
    tender.matching_status === "running" ||
    tender.matching_status === "pending" ||
    tender.risks_status === "running" ||
    tender.risks_status === "pending" ||
    tender.drafting_status === "running" ||
    tender.drafting_status === "pending"
  );
}

export function PipelineProgressBanner({ tender }: { tender: TenderFull }) {
  const [visible, setVisible] = useState(hasPendingWork(tender));
  const [dismissing, setDismissing] = useState(false);
  const pending = hasPendingWork(tender);

  useEffect(() => {
    if (pending) { setVisible(true); setDismissing(false); return; }
    if (!visible) return;
    const t1 = setTimeout(() => setDismissing(true), 1_200);
    const t2 = setTimeout(() => setVisible(false), 1_520);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pending, visible]);

  if (!visible) return null;

  const steps = derivePipelineSteps(tender);
  const activeIdx = steps.findIndex((s) => s.state === "active");

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "industrial-border bg-surface p-6 transition-opacity duration-300",
        dismissing ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-6">
        Response Pipeline
      </p>
      <div className="flex items-center justify-between relative">
        {/* Track line */}
        <div className="absolute top-[7px] left-0 w-full h-px bg-outline-variant z-0" />
        {/* Progress line */}
        <div
          className="absolute top-[5px] left-0 h-1 bg-primary z-0 transition-all duration-700"
          style={{ width: `${(Math.max(0, activeIdx) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, i) => (
          <div key={i} className="relative z-10 flex flex-col items-center gap-2">
            {step.state === "active" ? (
              <div className="w-6 h-6 rounded-full bg-primary border-4 border-surface flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 rounded-full bg-on-primary" />
              </div>
            ) : step.state === "complete" ? (
              <div className="w-4 h-4 rounded-full bg-primary border-4 border-surface ring-1 ring-primary" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-surface-container border-4 border-surface ring-1 ring-outline-variant" />
            )}
            <span
              className={[
                "font-label-md text-label-md text-center max-w-[80px]",
                step.state === "active"
                  ? "text-primary font-extrabold underline decoration-primary decoration-2"
                  : step.state === "complete"
                  ? "text-on-surface font-bold"
                  : "text-on-surface-variant",
              ].join(" ")}
            >
              {step.label.replace(".", "")}
              {step.state === "active" && <InkStroke className="ml-1 inline-block" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace `components/RedFlagBanner.tsx`**

```tsx
"use client";

import type { TenderFull } from "@/lib/types";

type Blocker = { label: string; count: number };

function deriveBlockers(tender: TenderFull): Blocker[] {
  const blockers: Blocker[] = [];
  const missingDocs = tender.required_documents.filter(
    (d) => d.status === "missing" || d.status === "requested",
  ).length;
  if (missingDocs > 0)
    blockers.push({ label: `required ${missingDocs === 1 ? "document" : "documents"} missing or not started`, count: missingDocs });

  const activeHighRisks = tender.risks.filter(
    (r) => (r.severity === "critical" || r.severity === "high") && !r.is_false_positive && r.decision == null,
  ).length;
  if (activeHighRisks > 0)
    blockers.push({ label: `high or critical ${activeHighRisks === 1 ? "risk" : "risks"} without a decision`, count: activeHighRisks });

  const missingMandatory = tender.requirements.filter(
    (r) => r.is_mandatory && r.match_status === "not_covered",
  ).length;
  if (missingMandatory > 0)
    blockers.push({ label: `mandatory ${missingMandatory === 1 ? "requirement" : "requirements"} not covered`, count: missingMandatory });

  const unreviewed = tender.requirements.filter(
    (r) => !r.reviewed_at && r.draft_status === "ready",
  ).length;
  if (unreviewed > 0)
    blockers.push({ label: `draft ${unreviewed === 1 ? "response" : "responses"} pending review`, count: unreviewed });

  return blockers;
}

export function RedFlagBanner({
  tender,
  onViewBlockers,
}: {
  tender: TenderFull;
  onViewBlockers?: () => void;
}) {
  const blockers = deriveBlockers(tender);
  if (blockers.length === 0) return null;

  return (
    <div
      role="alert"
      aria-label="Submission blockers"
      className="heavy-border border-error bg-error-container/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
    >
      <div className="flex items-start gap-4">
        <div className="bg-error text-on-error p-2 flex-shrink-0">
          <span className="material-symbols-outlined">warning</span>
        </div>
        <div>
          <h3 className="font-headline-sm text-headline-sm text-error uppercase">
            Submission Not Ready
          </h3>
          <ul className="mt-2 space-y-1">
            {blockers.map((b) => (
              <li key={b.label} className="font-body-md text-body-md flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-error rounded-full flex-shrink-0" />
                <span className="font-data-md text-data-md text-error mr-1">{b.count}</span>
                {b.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {onViewBlockers && (
        <button
          type="button"
          onClick={onViewBlockers}
          className="bg-on-surface text-surface px-6 py-3 font-label-md text-label-md uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-2 flex-shrink-0"
        >
          View Blockers
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Update `components/TenderDashboard.tsx`** — add footer, update layout wrapper

In `TenderDashboard.tsx`, replace the outermost returned JSX (the `<>…</>` fragment) with:

```tsx
  return (
    <>
      {showOverlay && (
        <AnalysisProgressScreen
          tender={tender}
          onDismissed={() => setShowOverlay(false)}
        />
      )}
      <div className="flex flex-col min-h-screen">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant/30 flex flex-col px-8 py-4 gap-4">
          <TenderHeader tender={tender} />
          <Tabs
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "requirements", label: "Requirements", count: counts.total },
              {
                key: "documents",
                label: "Documents",
                badge: missingDocBadge > 0 ? missingDocBadge : undefined,
                count: missingDocBadge === 0 ? tender.required_documents.length : undefined,
              },
              {
                key: "risks",
                label: "Risks",
                badge: highRiskBadge > 0 ? highRiskBadge : undefined,
                count: highRiskBadge === 0 ? tender.risks.length : undefined,
              },
              {
                key: "clarifications",
                label: "Clarifications",
                badge: clarificationBadge > 0 ? clarificationBadge : undefined,
                count: clarificationBadge === 0 ? tender.clarification_questions.length : undefined,
              },
              {
                key: "action_plan",
                label: "Action plan",
                badge: actionPlanBadge > 0 ? actionPlanBadge : undefined,
              },
              { key: "capabilities", label: "Capabilities" },
              { key: "export", label: "Export" },
            ]}
            active={tab}
            onChange={(k) => setTab(k as TabKey)}
          />
        </header>

        {/* Content */}
        <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
          {tender.extraction_status === "complete" && (
            <PipelineProgressBanner tender={tender} />
          )}
          {tender.extraction_status === "complete" && (
            <RedFlagBanner tender={tender} onViewBlockers={() => setTab("action_plan")} />
          )}

          {tab === "overview" && <OverviewTab tender={tender} counts={counts} />}
          {tab === "requirements" && (
            <AnalysisTab tender={tender} capabilities={capabilities} counts={counts} onTenderChange={setTender} />
          )}
          {tab === "documents" && (
            <DocumentsTab docs={tender.required_documents} onRefresh={refreshTender} />
          )}
          {tab === "risks" && (
            <RisksTab risks={tender.risks} onRiskUpdated={handleRiskUpdated} />
          )}
          {tab === "clarifications" && (
            <ClarificationsTab
              tenderId={tender.id}
              questions={tender.clarification_questions}
              onQuestionsChange={handleClarificationsChange}
            />
          )}
          {tab === "action_plan" && <ActionPlanTab tender={tender} />}
          {tab === "capabilities" && (
            <CapabilitiesTab
              tenderId={tender.id}
              capabilities={capabilities}
              onCapabilitiesChange={setCapabilities}
              onRefreshCapabilities={refreshCapabilities}
              onRefreshTender={refreshTender}
            />
          )}
          {tab === "export" && <ExportTab tender={tender} />}
        </div>

        {/* Footer action bar */}
        <footer className="border-t border-outline-variant/30 bg-surface px-8 py-6 flex justify-between items-center">
          <div className="flex gap-4">
            <button className="flex items-center gap-2 industrial-border px-4 py-2 font-label-md text-label-md uppercase hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-sm">share</span>
              Collaborate
            </button>
            <button className="flex items-center gap-2 industrial-border px-4 py-2 font-label-md text-label-md uppercase hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-sm">history</span>
              Revision History
            </button>
          </div>
          <div className="flex gap-4">
            <button className="bg-surface-container-lowest industrial-border px-6 py-3 font-label-md text-label-md uppercase hover:bg-surface-container transition-colors">
              Save Draft
            </button>
            <button className="bg-primary text-on-primary px-8 py-3 font-label-md text-label-md uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(112,93,0,0.3)] active:translate-y-0.5 active:shadow-none">
              Submit Package
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </footer>
      </div>
    </>
  );
```

- [ ] **Step 6: Update `app/tenders/[id]/page.tsx`** — remove px-7 padding wrapper (header now inside TenderDashboard)

The page.tsx already just renders `<Shell><TenderDashboard initial={tender} initialCapabilities={capabilities} /></Shell>`. No change needed — TenderDashboard now owns its own layout.

- [ ] **Step 7: Run typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/TenderHeader.tsx components/Tabs.tsx components/PipelineProgressBanner.tsx components/RedFlagBanner.tsx components/TenderDashboard.tsx
git commit -m "feat: redesign dashboard shell — sticky top bar, tabs, pipeline banner, red flag banner"
```

---

## Task 6: Overview Tab + StatusDot + CoverageStats

**Files:**
- Modify: `components/StatusDot.tsx`
- Modify: `components/CoverageStats.tsx`
- Modify: `components/tabs/OverviewTab.tsx`

- [ ] **Step 1: Replace `components/StatusDot.tsx`**

```tsx
import { cn } from "@/lib/utils";

export type StatusKind =
  | "fully_covered"
  | "partially_covered"
  | "not_covered"
  | "unclear"
  | null
  | undefined;

const STATUS_COLOR: Record<NonNullable<StatusKind>, string> = {
  fully_covered:     "#705d00",
  partially_covered: "#e9c400",
  not_covered:       "#ba1a1a",
  unclear:           "#7e775f",
};

export const STATUS_LABEL: Record<NonNullable<StatusKind>, string> = {
  fully_covered:     "Covered",
  partially_covered: "Partial",
  not_covered:       "Missing",
  unclear:           "Unclear",
};

export function StatusDot({
  status,
  className,
}: {
  status: StatusKind;
  ring?: boolean;
  className?: string;
}) {
  const color = status ? STATUS_COLOR[status] : "#d0c6ab";
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block w-1.5 h-1.5 rounded-full flex-shrink-0", className)}
      style={{ background: color }}
    />
  );
}

export function StatusPill({ status }: { status: StatusKind }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-outline" />
        Pending
      </span>
    );
  }
  const color = STATUS_COLOR[status];
  return (
    <span className="inline-flex items-center gap-1.5 font-label-md text-label-md" style={{ color }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {STATUS_LABEL[status]}
    </span>
  );
}
```

- [ ] **Step 2: Replace `components/CoverageStats.tsx`**

```tsx
"use client";

import { StatusDot } from "./StatusDot";
import type { RequirementCounts } from "@/lib/types";

export function CoverageStats({ counts }: { counts: RequirementCounts }) {
  const total = counts.total;
  if (total === 0) {
    return (
      <p className="font-body-md text-body-md text-on-surface-variant py-4">
        Coverage will appear here once matching completes.
      </p>
    );
  }
  const seg = (n: number) => `${(n / total) * 100}%`;

  return (
    <section
      className="grid grid-cols-2 md:grid-cols-4 industrial-border divide-x divide-outline-variant bg-surface-container-lowest"
      aria-label="Coverage summary"
    >
      <CoverageTile count={counts.covered} label="Fully Covered" color="#705d00" />
      <CoverageTile count={counts.partial} label="Partially" color="#e9c400" />
      <CoverageTile count={counts.missing} label="Not Covered" color="#ba1a1a" />
      <CoverageTile count={counts.unclear} label="Unclear" color="#7e775f" />
    </section>
  );
}

function CoverageTile({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="p-6 text-center">
      <div className="w-2 h-2 rounded-full mx-auto mb-3" style={{ background: color }} />
      <p className="font-headline-sm text-headline-sm text-on-surface">{count}</p>
      <p className="font-label-md text-label-md text-on-surface-variant uppercase">{label}</p>
    </div>
  );
}
```

- [ ] **Step 3: Update `components/tabs/OverviewTab.tsx`**

Replace the `bidRecommendationColor` function and the entire returned JSX. Keep all business logic (`computeBidReadiness`, `computeSubmissionCompleteness`, `TimelineRow`) unchanged. Only update the visual layer.

Replace the `bidRecommendationColor` function:

```tsx
function bidRecommendationColor(r: BidRecommendation): string {
  if (r === "Strong Bid") return "#705d00";
  if (r === "Conditional Bid") return "#e9c400";
  if (r === "High Risk Bid") return "#93000a";
  return "#ba1a1a";
}
```

Replace the returned JSX of `OverviewTab`:

```tsx
  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Left column */}
      <div className="col-span-12 lg:col-span-8 space-y-8">
        {/* Bid Recommendation */}
        <div className="grid grid-cols-1 md:grid-cols-2 industrial-border bg-surface-container-lowest overflow-hidden">
          <div className="p-8 border-b md:border-b-0 md:border-r border-outline-variant bg-surface-container-low/30">
            <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-4">
              Strategic Assessment
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <h3
                className="font-headline-lg text-headline-lg"
                style={{ color: bidRecommendationColor(bidReadiness.recommendation) }}
              >
                {bidReadiness.recommendation}
              </h3>
              <span className="font-data-md text-data-md bg-primary-container text-on-primary-container px-2 py-1">
                SCORE: {bidReadiness.score}%
              </span>
            </div>
            <div className="space-y-3 mt-4">
              <p className="font-label-md text-label-md text-on-surface font-bold uppercase">
                Decision Drivers
              </p>
              {bidReadiness.reasons.map((r) => (
                <div key={r} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    {r.startsWith("No missing") ? "check_circle" : "cancel"}
                  </span>
                  <span className="font-body-md text-body-md">{r}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Donut chart */}
          <div className="p-8 flex flex-col justify-center items-center bg-surface-container-lowest">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e4e2e1" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="transparent"
                  stroke="#705d00"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - bidReadiness.score / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-headline-lg text-headline-lg">{bidReadiness.score}%</span>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase">
                  Readiness
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Coverage tiles */}
        <CoverageStats counts={counts} />

        {/* Evaluation criteria */}
        {tender.evaluation_criteria.length > 0 && (
          <div className="industrial-border bg-surface-container-lowest">
            <div className="p-4 border-b border-outline-variant bg-on-surface text-surface">
              <h4 className="font-label-md text-label-md uppercase tracking-widest">
                Weighting &amp; Evaluation Matrix
              </h4>
            </div>
            <div className="divide-y divide-outline-variant">
              {tender.evaluation_criteria.map((c) => (
                <div key={c.id} className="p-6 space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="font-body-md text-body-md font-bold">{c.criterion}</span>
                    {c.weight_percent != null && (
                      <span className="font-data-md text-data-md">{c.weight_percent}% WEIGHT</span>
                    )}
                  </div>
                  {c.weight_percent != null && (
                    <div className="w-full h-3 bg-secondary-container">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, c.weight_percent)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="col-span-12 lg:col-span-4 space-y-8">
        {/* Submission completeness */}
        <div className="industrial-border bg-surface-container-high/50">
          <div className="p-6 border-b border-outline-variant bg-surface-container-lowest">
            <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-4">
              Submission Progress
            </p>
            <div className="flex items-center gap-4 mb-2">
              <h3 className="font-headline-md text-headline-md">{completeness.score}%</h3>
              <div className="flex-1 h-2 bg-secondary-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${completeness.score}%` }}
                />
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {completeness.components.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between p-3 bg-surface-container-lowest industrial-border"
              >
                <span
                  className={[
                    "font-body-md text-body-md",
                    c.blocking ? "text-error" : "",
                  ].join(" ")}
                >
                  {c.label}
                </span>
                <span
                  className={[
                    "font-data-md text-data-md",
                    c.blocking ? "text-error font-bold" : "text-primary",
                  ].join(" ")}
                >
                  {c.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        {(tender.publication_date || tender.clarification_deadline || tender.submission_deadline) && (
          <div className="industrial-border bg-surface-container-lowest">
            <div className="p-4 border-b border-outline-variant">
              <h4 className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
                Critical Deadlines
              </h4>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant">
                  <th className="p-3 border-b border-outline-variant font-label-md text-[10px] uppercase">
                    Milestone
                  </th>
                  <th className="p-3 border-b border-outline-variant font-label-md text-[10px] uppercase text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="font-data-md text-data-md divide-y divide-outline-variant">
                {tender.publication_date && (
                  <TimelineRow label="Publication" date={tender.publication_date} />
                )}
                {tender.clarification_deadline && (
                  <TimelineRow label="Clarifications Due" date={tender.clarification_deadline} warn />
                )}
                {tender.internal_review_deadline && (
                  <TimelineRow label="Internal Review" date={tender.internal_review_deadline} warn />
                )}
                {tender.final_approval_deadline && (
                  <TimelineRow label="Final Approval" date={tender.final_approval_deadline} warn />
                )}
                {tender.submission_deadline && (
                  <TimelineRow label="Submission" date={tender.submission_deadline} warn />
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
```

Also replace `TimelineRow` to use new classes:

```tsx
function TimelineRow({ label, date, warn = false }: { label: string; date: string; warn?: boolean }) {
  const days = daysUntil(date);
  const tone =
    warn && days != null
      ? days < 0 ? "overdue" : days <= 7 ? "soon" : "default"
      : "default";

  return (
    <tr className="hover:bg-surface-container-low transition-colors">
      <td className="p-3">
        <p className="font-bold">{label}</p>
        <p className="text-on-surface-variant text-[11px]">{formatDate(date)}</p>
      </td>
      <td className="p-3 text-right">
        {tone === "overdue" ? (
          <span className="bg-error text-on-error px-2 py-0.5 font-label-md">OVERDUE</span>
        ) : days != null ? (
          <span className={tone === "soon" ? "text-primary font-bold" : "text-on-surface-variant"}>
            In {days} days
          </span>
        ) : (
          <span className="text-on-surface-variant">—</span>
        )}
      </td>
    </tr>
  );
}
```

Add the needed import at the top of the file (CoverageStats is already used but now it's imported differently):

```tsx
import { CoverageStats } from "../CoverageStats";
```

Remove the local `formatDate` and `daysUntil` helpers at the bottom of OverviewTab.tsx (they're now imported from `@/lib/utils` at the top of the file — confirm the import line includes them):

```tsx
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
```

- [ ] **Step 4: Run typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/StatusDot.tsx components/CoverageStats.tsx components/tabs/OverviewTab.tsx
git commit -m "feat: redesign Overview tab with Stitch two-column layout and donut chart"
```

---

## Task 7: Requirements Tab

**Files:**
- Modify: `components/FilterStrip.tsx`
- Modify: `components/RequirementRow.tsx`
- Modify: `components/DraftStatusBadge.tsx`
- Modify: `components/DraftGenerationBanner.tsx`
- Modify: `components/tabs/AnalysisTab.tsx`

Apply the following token substitutions across all five files. For each class listed, do a global find-and-replace within the file:

| Find | Replace |
|---|---|
| `text-ink` | `text-on-surface` |
| `text-ink-2` | `text-on-surface-variant` |
| `text-ink-muted` | `text-on-surface-variant` |
| `text-ink-faint` | `text-outline` |
| `text-accent` | `text-error` |
| `text-status-covered` | `text-primary` |
| `text-status-partial` | `text-primary-fixed-dim` |
| `text-status-missing` | `text-error` |
| `text-status-unclear` | `text-outline` |
| `bg-surface` | `bg-surface` |
| `bg-surface-sunk` | `bg-surface-container-low` |
| `bg-surface-2` | `bg-surface-container` |
| `bg-accent-tint` | `bg-error-container/20` |
| `border-border` | `border-outline-variant` |
| `border-border-strong` | `border-outline` |
| `border-accent` | `border-error` |
| `font-serif text-20` | `font-headline-sm text-headline-sm` |
| `font-serif text-25` | `font-headline-md text-headline-md` |
| `font-serif text-16` | `font-body-lg text-body-lg` |
| `font-mono` | `font-data-md` |
| `text-13` | `text-[13px]` |
| `text-14` | `font-body-md text-body-md` |
| `text-12` | `text-[12px]` |
| `var(--status-covered)` | `#705d00` |
| `var(--status-partial)` | `#e9c400` |
| `var(--status-missing)` | `#ba1a1a` |
| `var(--status-unclear)` | `#7e775f` |

Additionally in `FilterStrip.tsx`:
- Replace `btn btn-ghost btn-sm` → `industrial-border px-3 py-1.5 font-label-md text-label-md hover:bg-surface-variant transition-colors`
- Replace `btn btn-sm` → `industrial-border px-3 py-1.5 font-label-md text-label-md bg-on-surface text-surface`
- Replace `input` class → `industrial-border bg-surface-container-lowest px-3 py-1.5 font-body-md rounded-none focus:outline-none focus:ring-1 focus:ring-primary`

In `DraftStatusBadge.tsx`:
- Replace `pill` CSS class usage with `inline-flex items-center gap-1.5 font-label-md text-label-md`

- [ ] **Step 1: Apply all substitutions** as described above across the 5 files.

- [ ] **Step 2: Run typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/FilterStrip.tsx components/RequirementRow.tsx components/DraftStatusBadge.tsx components/DraftGenerationBanner.tsx components/tabs/AnalysisTab.tsx
git commit -m "feat: update Requirements tab with Stitch tokens"
```

---

## Task 8: Remaining Dashboard Tabs

**Files:**
- Modify: `components/tabs/DocumentsTab.tsx`
- Modify: `components/tabs/RisksTab.tsx`
- Modify: `components/tabs/ClarificationsTab.tsx`
- Modify: `components/tabs/ActionPlanTab.tsx`
- Modify: `components/tabs/ExportTab.tsx`

Apply the same token substitution table from Task 7 to all five files.

Additionally:

**DocumentsTab.tsx** — replace `STATUS_COLOR` map:
```tsx
const STATUS_COLOR: Record<DocumentStatus, string> = {
  missing:        "#ba1a1a",
  requested:      "#ba1a1a",
  in_progress:    "#e9c400",
  uploaded:       "#e9c400",
  prepared:       "#e9c400",
  needs_review:   "#7e775f",
  approved:       "#705d00",
  not_applicable: "#d0c6ab",
};
```

Replace `var(--border-strong)` with `#d0c6ab` anywhere it appears.

**RisksTab.tsx** — replace `severityColor` function:
```tsx
function severityColor(s: Risk["severity"]): string {
  if (s === "critical") return "#ba1a1a";
  if (s === "high")     return "#93000a";
  if (s === "medium")   return "#7e775f";
  return "#4d4732";
}
```

For any `btn` class usages in these files, replace with:
- Secondary button: `industrial-border px-4 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-variant transition-colors`
- Primary button: `bg-primary text-on-primary px-6 py-2 font-label-md text-label-md hover:brightness-110 transition-all`
- Destructive button: `industrial-border px-4 py-2 font-label-md text-label-md text-error hover:bg-error hover:text-on-error transition-colors`
- Ghost/icon button: `p-2 text-on-surface-variant hover:text-primary transition-colors`

Replace `border-border` and `border-accent` with `border-outline-variant` / `border-error`.

- [ ] **Step 1: Apply all substitutions** across the 5 files.

- [ ] **Step 2: Run typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/tabs/DocumentsTab.tsx components/tabs/RisksTab.tsx components/tabs/ClarificationsTab.tsx components/tabs/ActionPlanTab.tsx components/tabs/ExportTab.tsx
git commit -m "feat: update Documents, Risks, Clarifications, Action Plan, Export tabs with Stitch tokens"
```

---

## Task 9: Capabilities

**Files:**
- Modify: `components/tabs/CapabilitiesTab.tsx`
- Modify: `components/CapabilitiesPageClient.tsx`
- Modify: `components/CapabilityMatrix.tsx`
- Modify: `app/capabilities/page.tsx`
- Modify: `app/logs/page.tsx`

- [ ] **Step 1: Update `app/capabilities/page.tsx`** and `app/logs/page.tsx`

Both currently import and use `Shell`. They should continue to do so (Shell now renders the sidebar). Verify they compile — no code changes expected unless they have inline style references to old tokens.

Run `grep -r "text-ink\|bg-surface-2\|border-border\|text-accent\|var(--" app/capabilities/ app/logs/` and fix any hits using the token table from Task 7.

- [ ] **Step 2: Apply token substitutions** to `CapabilitiesTab.tsx`, `CapabilitiesPageClient.tsx`, and `CapabilityMatrix.tsx` using the same table from Task 7.

Additionally replace any `btn` class with inline Tailwind per the pattern in Task 8. Replace `border-border` with `border-outline-variant`.

- [ ] **Step 3: Run typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Run lint**

```
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/tabs/CapabilitiesTab.tsx components/CapabilitiesPageClient.tsx components/CapabilityMatrix.tsx app/capabilities/page.tsx app/logs/page.tsx
git commit -m "feat: update Capabilities pages with Stitch tokens"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run typecheck**

```
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 2: Run lint**

```
npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Start dev server and verify each screen**

```
npm run dev
```

Visit and verify (visual check against screenshots in `stitch-designs/screenshots/`):
- [ ] `/login` — centered panel, corner accents, grid background
- [ ] `/` — sidebar, tenders list, dashed upload zone
- [ ] `/tenders/[id]` — sidebar, sticky top bar with metadata grid, tabs
- [ ] Overview tab — donut chart, 2-col layout, timeline table
- [ ] Requirements tab — coverage tiles, filter strip
- [ ] Documents / Risks / Clarifications / Action Plan / Export tabs
- [ ] `/capabilities` — sidebar, capability matrix

- [ ] **Step 4: Confirm no `var(--ink`, `var(--paper`, `var(--border`, `var(--accent` references remain**

```
grep -r "var(--ink\|var(--paper\|var(--border\|var(--accent\|text-ink\b\|bg-surface-2\|bg-paper\|border-border\b" app/ components/ --include="*.tsx" --include="*.ts"
```

Expected: no output (all old tokens replaced).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Stitch design migration — all screens updated"
```
