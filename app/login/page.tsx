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
