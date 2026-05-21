import type { Risk } from "@/lib/types";

function sevRank(s: Risk["severity"]): number {
  return s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;
}

function severityColor(s: Risk["severity"]): string {
  if (s === "critical") return "var(--severity-critical)";
  if (s === "high") return "var(--severity-high)";
  if (s === "medium") return "var(--severity-medium)";
  return "var(--severity-low)";
}

export function RisksTab({ risks }: { risks: Risk[] }) {
  const ordered = [...risks].sort((a, b) => sevRank(a.severity) - sevRank(b.severity));

  return (
    <section aria-label="Risks">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-25 text-ink leading-none">Risks</h2>
        <span className="text-12 text-ink-muted tabular">{risks.length} identified</span>
      </div>

      {risks.length === 0 ? (
        <p className="text-14 text-ink-muted py-7">No risks identified.</p>
      ) : (
        <ul className="border-t border-border divide-y divide-border">
          {ordered.map((r) => (
            <li key={r.id} className="py-4 space-y-2">
              <div className="flex items-center gap-2 text-12 uppercase tracking-wider">
                <span
                  className="dot"
                  style={{ background: severityColor(r.severity) }}
                  aria-hidden="true"
                />
                <span style={{ color: severityColor(r.severity) }} className="font-medium">
                  {r.severity}
                </span>
                <span className="text-ink-muted normal-case tracking-normal">{r.category}</span>
              </div>
              <p className="text-14 text-ink leading-snug">{r.description}</p>
              {r.source_location ? (
                <p className="text-12 text-ink-muted font-mono">{r.source_location}</p>
              ) : null}
              {r.recommended_action ? (
                <p className="text-13 text-ink-2">
                  <span className="label mr-1.5">Action</span>
                  {r.recommended_action}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
