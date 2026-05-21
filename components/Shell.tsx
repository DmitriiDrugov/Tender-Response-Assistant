import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

/**
 * App shell. Document-grade chrome: a thin header with the product name,
 * primary nav as small-caps links, and a logout affordance.
 * No sidebar — the dashboard is wider than that pattern deserves.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="px-7 lg:px-9 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-20 leading-none text-ink hover:text-accent transition-colors duration-160 ease-out"
          >
            Tender Response Assistant
          </Link>
          <nav className="flex items-center gap-7">
            <Link
              href="/"
              className="label hover:text-ink transition-colors duration-160 ease-out"
            >
              Tenders
            </Link>
            <Link
              href="/capabilities"
              className="label hover:text-ink transition-colors duration-160 ease-out"
            >
              Capabilities
            </Link>
            <Link
              href="/logs"
              className="label hover:text-ink transition-colors duration-160 ease-out"
            >
              Logs
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
