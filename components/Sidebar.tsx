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
