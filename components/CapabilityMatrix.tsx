"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Capability } from "@/lib/types";

const ORDERED_CATEGORIES = ["Certifications", "Past projects", "Technical", "Team & coverage"];

type Draft = { category: string; name: string; description: string; evidence: string };
const emptyDraft = (category = "Certifications"): Draft => ({
  category,
  name: "",
  description: "",
  evidence: "",
});

export function CapabilityMatrix({
  capabilities,
  onChange,
  onAfterAnyChange,
}: {
  capabilities: Capability[];
  onChange: (cs: Capability[]) => void;
  onAfterAnyChange?: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Capability[]>();
    for (const c of capabilities) {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    }
    return map;
  }, [capabilities]);

  const categoryKeys = useMemo(() => {
    const keys = new Set<string>(ORDERED_CATEGORIES);
    for (const c of capabilities) keys.add(c.category);
    return Array.from(keys);
  }, [capabilities]);

  async function add() {
    if (!draft) return;
    if (!draft.name.trim()) return;
    const res = await fetch("/api/capabilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: draft.category,
        name: draft.name,
        description: draft.description || null,
        evidence: draft.evidence || null,
      }),
    });
    if (!res.ok) return;
    const created = (await res.json()) as Capability;
    onChange([...capabilities, created]);
    setDraft(null);
    await onAfterAnyChange?.();
  }

  async function remove(id: string) {
    if (!confirm("Delete this capability?")) return;
    const res = await fetch(`/api/capabilities/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    onChange(capabilities.filter((c) => c.id !== id));
    await onAfterAnyChange?.();
  }

  async function patch(id: string, body: Partial<Pick<Capability, "name" | "description" | "evidence" | "category">>) {
    const res = await fetch(`/api/capabilities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as Capability;
    onChange(capabilities.map((c) => (c.id === id ? updated : c)));
    await onAfterAnyChange?.();
  }

  return (
    <div className="space-y-7">
      {categoryKeys.map((cat) => {
        const rows = grouped.get(cat) ?? [];
        return (
          <section key={cat} aria-labelledby={`cat-${cat}`} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 id={`cat-${cat}`} className="font-serif text-20 text-ink leading-none">
                {cat}
              </h3>
              <button
                type="button"
                onClick={() => setDraft(emptyDraft(cat))}
                className="btn btn-ghost btn-sm"
              >
                <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                Add
              </button>
            </div>

            {rows.length === 0 && !(draft && draft.category === cat) ? (
              <p className="text-13 text-ink-muted">No items.</p>
            ) : (
              <ul className="border-t border-border">
                {rows.map((c) => (
                  <CapabilityRow
                    key={c.id}
                    cap={c}
                    onSave={(body) => patch(c.id, body)}
                    onDelete={() => remove(c.id)}
                  />
                ))}
                {draft && draft.category === cat ? (
                  <CapabilityDraftRow
                    draft={draft}
                    onChange={setDraft}
                    onCancel={() => setDraft(null)}
                    onSubmit={add}
                  />
                ) : null}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function CapabilityRow({
  cap,
  onSave,
  onDelete,
}: {
  cap: Capability;
  onSave: (body: Partial<Pick<Capability, "name" | "description" | "evidence">>) => Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(cap.name);
  const [description, setDescription] = useState(cap.description ?? "");
  const [evidence, setEvidence] = useState(cap.evidence ?? "");
  const initial = useRef({ name: cap.name, description: cap.description, evidence: cap.evidence });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setName(cap.name);
    setDescription(cap.description ?? "");
    setEvidence(cap.evidence ?? "");
    initial.current = { name: cap.name, description: cap.description, evidence: cap.evidence };
  }, [cap.id, cap.name, cap.description, cap.evidence]);

  useEffect(() => {
    const dirty =
      name !== initial.current.name ||
      (description || null) !== (initial.current.description ?? null) ||
      (evidence || null) !== (initial.current.evidence ?? null);
    if (!dirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void onSave({
        name,
        description: description || null,
        evidence: evidence || null,
      });
      initial.current = { name, description, evidence };
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [name, description, evidence, onSave]);

  return (
    <li className="border-b border-border py-4 grid gap-4 md:grid-cols-[1fr_1.4fr_auto]">
      <div className="space-y-2">
        <label className="label block">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          aria-label="Capability name"
        />
        <label className="label block">Evidence</label>
        <textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          className="input text-13 min-h-[4.5rem]"
          aria-label="Evidence — references, certificate IDs, project numbers"
          placeholder="Reference numbers, certificate IDs, project codes."
        />
      </div>

      <div className="space-y-2">
        <label className="label block">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input text-14 min-h-[6.5rem]"
          aria-label="Capability description"
        />
      </div>

      <div className="flex md:flex-col items-end gap-2">
        <button
          type="button"
          onClick={onDelete}
          className="btn btn-ghost btn-sm"
          aria-label={`Delete capability ${cap.name}`}
        >
          <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function CapabilityDraftRow({
  draft,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <li className="border-b border-border py-4 grid gap-4 md:grid-cols-[1fr_1.4fr_auto] bg-surface-sunk -mx-5 px-5">
      <div className="space-y-2">
        <label className="label block">Name</label>
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          className="input"
          autoFocus
          aria-label="New capability name"
        />
        <label className="label block">Evidence</label>
        <textarea
          value={draft.evidence}
          onChange={(e) => onChange({ ...draft, evidence: e.target.value })}
          className="input text-13 min-h-[4.5rem]"
          aria-label="Evidence"
        />
      </div>

      <div className="space-y-2">
        <label className="label block">Description</label>
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          className="input text-14 min-h-[6.5rem]"
          aria-label="Description"
        />
      </div>

      <div className="flex md:flex-col items-end gap-2">
        <button type="button" onClick={onSubmit} disabled={!draft.name.trim()} className="btn btn-primary btn-sm">
          Add
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </li>
  );
}
