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
        paper: "var(--paper)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-sunk": "var(--surface-sunk)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-muted": "var(--ink-muted)",
        "ink-faint": "var(--ink-faint)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        "accent-tint": "var(--accent-tint)",
        "status-covered": "var(--status-covered)",
        "status-partial": "var(--status-partial)",
        "status-missing": "var(--status-missing)",
        "status-unclear": "var(--status-unclear)",
        "severity-critical": "var(--severity-critical)",
        "severity-high": "var(--severity-high)",
        "severity-medium": "var(--severity-medium)",
        "severity-low": "var(--severity-low)",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Source Serif 4", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "12": ["0.75rem", { lineHeight: "1.1rem" }],
        "14": ["0.875rem", { lineHeight: "1.35rem" }],
        "16": ["1rem", { lineHeight: "1.55rem" }],
        "20": ["1.25rem", { lineHeight: "1.7rem" }],
        "25": ["1.5625rem", { lineHeight: "2rem" }],
        "31": ["1.953rem", { lineHeight: "2.35rem" }],
        "39": ["2.441rem", { lineHeight: "2.8rem" }],
      },
      spacing: {
        "1": "0.25rem",
        "2": "0.5rem",
        "3": "0.75rem",
        "4": "1rem",
        "5": "1.25rem",
        "6": "1.75rem",
        "7": "2.5rem",
        "8": "3.5rem",
        "9": "5rem",
      },
      maxWidth: {
        "reading": "68ch",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      transitionDuration: {
        "160": "160ms",
        "240": "240ms",
        "320": "320ms",
      },
      keyframes: {
        "ink-stroke": {
          "0%": { strokeDashoffset: "120" },
          "60%": { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "-120" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "ink-stroke": "ink-stroke 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) infinite",
        "fade-in": "fade-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
