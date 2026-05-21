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
