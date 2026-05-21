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
      className="label hover:text-ink transition-colors duration-160 ease-out"
    >
      Sign out
    </button>
  );
}
