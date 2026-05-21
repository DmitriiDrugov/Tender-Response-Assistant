import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-[26rem]">
        <h1 className="font-serif text-31 leading-tight text-ink">
          Tender Response Assistant
        </h1>
        <p className="mt-3 text-14 text-ink-2">Enter passcode to continue.</p>
        <Suspense fallback={<div className="mt-7 h-24" aria-hidden="true" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
