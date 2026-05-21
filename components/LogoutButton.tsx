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
