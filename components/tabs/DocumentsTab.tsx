"use client";

import { useState } from "react";
import type { DocumentStatus, RequiredDocument, TenderFull } from "@/lib/types";

const DOC_STATUSES: DocumentStatus[] = [
  "missing",
  "requested",
  "in_progress",
  "uploaded",
  "prepared",
  "needs_review",
  "approved",
  "not_applicable",
];

const STATUS_LABEL: Record<DocumentStatus, string> = {
  missing: "Missing",
  requested: "Requested",
  in_progress: "In progress",
  uploaded: "Uploaded",
  prepared: "Prepared",
  needs_review: "Needs review",
  approved: "Approved",
  not_applicable: "N/A",
};

const STATUS_COLOR: Record<DocumentStatus, string> = {
  missing:        "#ba1a1a",
  requested:      "#ba1a1a",
  in_progress:    "#e9c400",
  uploaded:       "#e9c400",
  prepared:       "#e9c400",
  needs_review:   "#7e775f",
  approved:       "#705d00",
  not_applicable: "#d0c6ab",
};

const TEAMS = [
  "Bid Manager",
  "Warehouse Operations",
  "IT / WMS",
  "Legal",
  "Pricing",
  "Purchasing",
  "Project Manager",
  "LSP Partner",
  "EHS",
];

export function DocumentsTab({
  docs: initialDocs,
  onRefresh,
}: {
  docs: TenderFull["required_documents"];
  onRefresh: () => Promise<void>;
}) {
  const [docs, setDocs] = useState<RequiredDocument[]>(initialDocs);
  const [error, setError] = useState<string | null>(null);

  const prepared = docs.filter(
    (d) => d.status === "uploaded" || d.status === "prepared" || d.status === "approved",
  ).length;

  async function patchDoc(docId: string, fields: Partial<RequiredDocument>) {
    try {
      const res = await fetch(`/api/required-documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(d?.error ?? "Update failed.");
        return;
      }
      const updated = (await res.json()) as RequiredDocument;
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setError(null);
    } catch {
      setError("Network error.");
    }
  }

  function cycleStatus(docId: string, status: DocumentStatus) {
    const next = DOC_STATUSES[(DOC_STATUSES.indexOf(status) + 1) % DOC_STATUSES.length];
    void patchDoc(docId, { status: next });
  }

  return (
    <section aria-label="Required documents">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="font-serif text-25 text-on-surface leading-none">Required documents</h2>
        <span className="text-12 text-on-surface-variant tabular">
          {prepared}/{docs.length} prepared
        </span>
      </div>

      {docs.length === 0 ? (
        <p className="text-14 text-on-surface-variant py-7">No documents extracted.</p>
      ) : (
        <>
          {error ? (
            <p role="alert" className="text-13 text-error mb-3">{error}</p>
          ) : null}
          <ul className="border-t border-outline-variant divide-y divide-outline-variant">
            {docs.map((d) => (
              <DocumentRow
                key={d.id}
                doc={d}
                onCycleStatus={() => cycleStatus(d.id, d.status)}
                onPatch={(fields) => void patchDoc(d.id, fields)}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function DocumentRow({
  doc: d,
  onCycleStatus,
  onPatch,
}: {
  doc: RequiredDocument;
  onCycleStatus: () => void;
  onPatch: (fields: Partial<RequiredDocument>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="py-3.5 space-y-2">
      <div className="flex items-center justify-between gap-5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left text-14 text-on-surface leading-snug hover:text-error transition-colors duration-160"
        >
          <span className="flex items-baseline gap-2">
            {d.is_required ? (
              <span className="dot flex-shrink-0 mt-1.5" style={{ background: "#ba1a1a" }} />
            ) : null}
            {d.name}
            {d.source_section ? (
              <span className="text-12 text-on-surface-variant font-mono ml-1">{d.source_section}</span>
            ) : null}
          </span>
        </button>
        <button
          type="button"
          onClick={onCycleStatus}
          className="flex-shrink-0 flex items-center gap-2 text-13 text-on-surface-variant hover:text-on-surface transition-colors duration-160"
          title="Click to advance status"
        >
          <span
            className="dot"
            style={{ background: STATUS_COLOR[d.status] }}
            aria-hidden="true"
          />
          {STATUS_LABEL[d.status]}
        </button>
      </div>

      {expanded ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          <div className="space-y-1">
            <label className="label text-12">Status</label>
            <select
              value={d.status}
              onChange={(e) => onPatch({ status: e.target.value as DocumentStatus })}
              className="w-full h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
              aria-label="Document status"
            >
              {DOC_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="label text-12">Team / Owner</label>
            <OwnerInput
              value={d.owner_name ?? ""}
              onCommit={(v) => onPatch({ owner_name: v || null })}
            />
          </div>
          <div className="space-y-1">
            <label className="label text-12">Due date</label>
            <input
              type="date"
              value={d.due_date ?? ""}
              onChange={(e) => onPatch({ due_date: e.target.value || null })}
              className="w-full h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
              aria-label="Due date"
            />
          </div>
        </div>
      ) : (
        d.owner_name || d.due_date ? (
          <div className="flex items-center gap-5 text-12 text-on-surface-variant">
            {d.owner_name ? <span>{d.owner_name}</span> : null}
            {d.due_date ? <span>Due {d.due_date}</span> : null}
          </div>
        ) : null
      )}
    </li>
  );
}

function OwnerInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onCommit(local); }}
      onKeyDown={(e) => { if (e.key === "Enter") onCommit(local); }}
      placeholder="Name"
      className="w-full h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
      aria-label="Document owner"
    />
  );
}
