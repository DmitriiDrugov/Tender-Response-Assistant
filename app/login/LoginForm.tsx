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
        setError(data?.error || "Login failed.");
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
    <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
      <div className="space-y-2">
        <label htmlFor="passcode" className="label block">
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
          className="input font-mono"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "passcode-error" : undefined}
        />
        {error ? (
          <p id="passcode-error" className="text-13 text-accent">
            {error}
          </p>
        ) : null}
      </div>

      <button type="submit" disabled={isPending || !passcode} className="btn btn-primary w-full">
        {isPending ? "Continuing…" : "Continue"}
      </button>
    </form>
  );
}
