"use client";

import { useState } from "react";
import type { DocumentStatus, TenderFull } from "@/lib/types";

const DOC_STATUSES: DocumentStatus[] = ["missing", "uploaded", "needs_review", "approved"];

const STATUS_LABEL: Record<DocumentStatus, string> = {
  missing: "Missing",
  uploaded: "Uploaded",
  needs_review: "Needs review",
  approved: "Approved",
};

const STATUS_COLOR: Record<DocumentStatus, string> = {
  missing: "var(--status-missing)",
  uploaded: "var(--status-partial)",
  needs_review: "var(--status-unclear)",
  approved: "var(--status-covered)",
};

export function DocumentsTab({
  docs,
  onRefresh,
}: {
  docs: TenderFull["required_documents"];
  onRefresh: () => Promise<void>;
}) {
  const prepared = docs.filter(
    (d) => d.status === "uploaded" || d.status === "approved",
  ).length;
  const [error, setError] = useState<string | null>(null);

  async function handleStatusCycle(docId: string, status: DocumentStatus) {
    const next = DOC_STATUSES[(DOC_STATUSES.indexOf(status) + 1) % DOC_STATUSES.length];
    try {
      const res = await fetch(`/api/required-documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(d?.error ?? "Status update failed.");
        return;
      }
      setError(null);
      await onRefresh();
    } catch {
      setError("Network error.");
    }
  }

  return (
    <section aria-label="Required documents">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-25 text-ink leading-none">Required documents</h2>
        <span className="text-12 text-ink-muted tabular">
          {prepared}/{docs.length} prepared
        </span>
      </div>

      {docs.length === 0 ? (
        <p className="text-14 text-ink-muted py-7">No documents extracted.</p>
      ) : (
        <>
          {error ? (
            <p role="alert" className="text-13 text-accent mb-3">
              {error}
            </p>
          ) : null}
          <ul className="border-t border-border divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="py-3.5 flex items-center justify-between gap-5">
                <span className="text-14 text-ink leading-snug flex-1">{d.name}</span>
                <button
                  type="button"
                  onClick={() => void handleStatusCycle(d.id, d.status)}
                  className="flex-shrink-0 flex items-center gap-2 text-13 text-ink-muted hover:text-ink transition-colors duration-160"
                  title="Click to change status"
                >
                  <span
                    className="dot"
                    style={{ background: STATUS_COLOR[d.status] }}
                    aria-hidden="true"
                  />
                  {STATUS_LABEL[d.status]}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
