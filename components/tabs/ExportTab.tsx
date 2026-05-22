"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { Requirement, TenderFull } from "@/lib/types";

export function ExportTab({ tender }: { tender: TenderFull }) {
  const allIds = useMemo(() => tender.requirements.map((r) => r.id), [tender.requirements]);
  const [included, setIncluded] = useState<Set<string>>(new Set(allIds));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setAll(value: boolean) {
    setIncluded(value ? new Set(allIds) : new Set());
  }

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenders/${tender.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ included_section_ids: Array.from(included) }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(d?.error || "Export failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tender.title || "tender"} - response draft.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error during download.");
    } finally {
      setDownloading(false);
    }
  }

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, Requirement[]>();
    for (const r of tender.requirements) {
      const key = r.category || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [tender.requirements]);

  const includedCount = included.size;
  const total = allIds.length;

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_22rem] items-start">
      <DocumentPreview tender={tender} included={included} />

      <aside className="lg:sticky lg:top-5 border border-outline-variant bg-surface">
        <div className="px-5 py-4 border-b border-outline-variant space-y-3">
          <h3 className="font-serif text-20 text-on-surface leading-none">Export</h3>
          <p className="text-13 text-on-surface-variant">
            {includedCount} of {total} requirements included.
          </p>
          <button
            type="button"
            onClick={download}
            disabled={downloading || includedCount === 0}
            className="bg-primary text-on-primary px-4 py-2 font-label-md text-label-md hover:brightness-110 transition-all w-full"
          >
            <Download size={14} strokeWidth={1.5} aria-hidden="true" />
            {downloading ? "Preparing DOCX." : "Download DOCX"}
          </button>
          <div className="flex items-center gap-3 text-12">
            <button type="button" onClick={() => setAll(true)} className="link-accent">
              Select all
            </button>
            <button type="button" onClick={() => setAll(false)} className="link-accent">
              Select none
            </button>
          </div>
          {error ? <p className="text-12 text-error">{error}</p> : null}
        </div>

        <div className="px-5 py-4 space-y-6 max-h-[64vh] overflow-y-auto">
          {groupedByCategory.map(([cat, rows]) => (
            <section key={cat} aria-labelledby={`incl-${cat}`}>
              <div className="label mb-2" id={`incl-${cat}`}>
                {cat}
              </div>
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={r.id}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={included.has(r.id)}
                        onChange={() => toggle(r.id)}
                        className="mt-1 accent-primary"
                      />
                      <span className="text-12 text-on-surface leading-snug line-clamp-2">{r.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}

function DocumentPreview({
  tender,
  included,
}: {
  tender: TenderFull;
  included: Set<string>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const reqs = tender.requirements.filter((r) => included.has(r.id));

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, Requirement[]>();
    for (const r of reqs) {
      const key = r.category || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [reqs]);

  let counter = 0;

  return (
    <article
      className="bg-surface border border-outline-variant px-9 py-9 prose-doc"
      aria-label="Document preview"
    >
      <header className="border-b border-on-surface pb-3 mb-7">
        <p className="text-12 uppercase tracking-[0.15em] font-medium text-on-surface">Tender response</p>
        <h2 className="font-serif text-31 text-on-surface leading-tight mt-2">{tender.title}</h2>
        <p className="text-13 text-on-surface-variant mt-2 italic">
          {[
            tender.issuing_authority ? `Issuing authority: ${tender.issuing_authority}` : null,
            tender.tender_id_external ? `Tender ID: ${tender.tender_id_external}` : null,
            tender.submission_deadline ? `Submission deadline: ${tender.submission_deadline}` : null,
            `Response prepared: ${today}`,
          ]
            .filter(Boolean)
            .join("    ·    ")}
        </p>
      </header>

      {tender.scope_summary ? (
        <section className="mb-7">
          <h3 className="font-serif text-20 text-on-surface mb-2">Scope summary</h3>
          <p>{tender.scope_summary}</p>
        </section>
      ) : null}

      <h3 className="font-serif text-25 text-on-surface mb-5">Requirements and responses</h3>

      {groupedByCategory.map(([cat, rows]) => (
        <section key={cat} className="mb-7">
          <h4 className="font-serif text-20 text-on-surface mb-3">{cat}</h4>
          {rows.map((r) => {
            counter++;
            return (
              <div key={r.id} className="border-t border-outline-variant py-4 space-y-2">
                <p className="font-serif text-16 italic text-on-surface">
                  <span className="font-medium not-italic">{counter}. </span>
                  {r.text}
                  {r.is_mandatory ? (
                    <span className="not-italic text-12 text-error ml-2 uppercase tracking-wider">
                      [Mandatory]
                    </span>
                  ) : null}
                </p>
                {r.source_excerpt ? (
                  <p className="text-13 text-on-surface-variant italic pl-5">Source: "{r.source_excerpt}"</p>
                ) : null}
                <div className="label">Response</div>
                <p>{r.draft_response?.trim() || "[Pending bid manager input]"}</p>
                {r.reviewer_notes ? (
                  <p className="text-13 text-on-surface-variant">
                    <span className="label mr-1">Reviewer note</span>
                    {r.reviewer_notes}
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>
      ))}

      {tender.risks.length > 0 ? (
        <section>
          <h3 className="font-serif text-25 text-on-surface mb-3">Identified risks</h3>
          {[...tender.risks]
            .sort((a, b) => sevRank(a.severity) - sevRank(b.severity))
            .map((r) => (
              <div key={r.id} className="py-3 border-t border-outline-variant">
                <p className="text-12 uppercase tracking-wider font-medium">
                  <span className="text-error">{r.severity}</span>
                  <span className="text-on-surface-variant ml-3 normal-case tracking-normal">
                    {r.category}
                  </span>
                </p>
                <p className="mt-1">{r.description}</p>
                {r.source_location ? (
                  <p className="text-13 text-on-surface-variant italic mt-1">Source: {r.source_location}</p>
                ) : null}
                {r.recommended_action ? (
                  <p className="text-13 text-on-surface-variant mt-1">
                    <span className="label mr-1">Action</span>
                    {r.recommended_action}
                  </p>
                ) : null}
              </div>
            ))}
        </section>
      ) : null}
    </article>
  );
}

function sevRank(s: TenderFull["risks"][number]["severity"]): number {
  return s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;
}
