"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import type { Capability } from "@/lib/types";
import { cn } from "@/lib/utils";

const ORDERED_CATEGORIES = ["Certifications", "Past projects", "Technical", "Team & coverage"] as const;
const ALL_SECTIONS = "All sections";

const SECTION_HELPERS: Record<string, string> = {
  Certifications: "Formal certifications and compliance evidence.",
  "Past projects": "Reference projects that can support tender responses.",
  Technical: "Technical capabilities, integrations, platforms and tools.",
  "Team & coverage": "Support coverage, staffing, languages and availability.",
};

type Draft = { category: string; name: string; description: string; evidence: string };

type EditorState =
  | { mode: "create"; draft: Draft }
  | { mode: "edit"; id: string; draft: Draft };

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
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState(ALL_SECTIONS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const categoryKeys = useMemo(() => {
    const keys = new Set<string>(ORDERED_CATEGORIES);
    for (const c of capabilities) keys.add(c.category);
    return Array.from(keys);
  }, [capabilities]);

  const filteredCapabilities = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return capabilities.filter((c) => {
      const sectionMatches = sectionFilter === ALL_SECTIONS || c.category === sectionFilter;
      if (!sectionMatches) return false;
      if (!normalized) return true;
      return [c.name, c.evidence ?? "", c.description ?? ""].some((value) =>
        value.toLowerCase().includes(normalized),
      );
    });
  }, [capabilities, query, sectionFilter]);

  const grouped = useMemo(() => groupByCategory(filteredCapabilities), [filteredCapabilities]);
  const allGrouped = useMemo(() => groupByCategory(capabilities), [capabilities]);

  const visibleCategories = useMemo(() => {
    if (sectionFilter !== ALL_SECTIONS) return categoryKeys.filter((cat) => cat === sectionFilter);
    if (query.trim()) {
      return categoryKeys.filter((cat) => (grouped.get(cat) ?? []).length > 0 || (allGrouped.get(cat) ?? []).length === 0);
    }
    return categoryKeys;
  }, [allGrouped, categoryKeys, grouped, query, sectionFilter]);

  const activeEditId = editor?.mode === "edit" ? editor.id : null;

  useEffect(() => {
    if (!activeEditId) return;
    const updated = capabilities.find((c) => c.id === activeEditId);
    if (!updated) {
      setEditor(null);
      return;
    }
    setEditor({
      mode: "edit",
      id: updated.id,
      draft: capabilityToDraft(updated),
    });
  }, [activeEditId, capabilities]);

  function startCreate(category: string) {
    setMessage(null);
    setEditor({ mode: "create", draft: emptyDraft(category) });
  }

  function startEdit(capability: Capability) {
    setMessage(null);
    setEditor({
      mode: "edit",
      id: capability.id,
      draft: capabilityToDraft(capability),
    });
  }

  async function saveEditor() {
    if (!editor || !editor.draft.name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      if (editor.mode === "create") {
        const res = await fetch("/api/capabilities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: editor.draft.category,
            name: editor.draft.name.trim(),
            description: nullableText(editor.draft.description),
            evidence: nullableText(editor.draft.evidence),
          }),
        });
        if (!res.ok) {
          setMessage("Capability could not be added. Review the fields and try again.");
          return;
        }
        const created = (await res.json()) as Capability;
        onChange([...capabilities, created]);
        setEditor(null);
        setMessage("Capability added.");
        await onAfterAnyChange?.();
        return;
      }

      const res = await fetch(`/api/capabilities/${editor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editor.draft.name.trim(),
          description: nullableText(editor.draft.description),
          evidence: nullableText(editor.draft.evidence),
        }),
      });
      if (!res.ok) {
        setMessage("Capability could not be saved. Review the fields and try again.");
        return;
      }
      const updated = (await res.json()) as Capability;
      onChange(capabilities.map((c) => (c.id === editor.id ? updated : c)));
      setEditor(null);
      setMessage("Capability saved.");
      await onAfterAnyChange?.();
    } finally {
      setSaving(false);
    }
  }

  async function remove(capability: Capability) {
    if (!confirm(`Delete "${capability.name}"?`)) return;
    const res = await fetch(`/api/capabilities/${capability.id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage("Capability could not be deleted. Try again.");
      return;
    }
    onChange(capabilities.filter((c) => c.id !== capability.id));
    if (activeEditId === capability.id) setEditor(null);
    setMessage("Capability deleted.");
    await onAfterAnyChange?.();
  }

  return (
    <div className={cn("grid gap-6", editor ? "xl:grid-cols-[minmax(0,1fr)_23rem]" : "grid-cols-1")}>
      <div className="space-y-6">
        <CapabilitySummaryCards capabilities={capabilities} />

        <CapabilitySearchFilters
          query={query}
          sectionFilter={sectionFilter}
          sectionOptions={[ALL_SECTIONS, ...categoryKeys]}
          onQueryChange={setQuery}
          onSectionFilterChange={setSectionFilter}
        />

        {message ? <p className="text-14 text-ink-muted" aria-live="polite">{message}</p> : null}

        <div className="space-y-7">
          {visibleCategories.map((cat) => {
            const rows = grouped.get(cat) ?? [];
            const unfilteredCount = (allGrouped.get(cat) ?? []).length;
            return (
              <CapabilitySection
                key={cat}
                category={cat}
                capabilities={rows}
                unfilteredCount={unfilteredCount}
                isFiltered={Boolean(query.trim()) || sectionFilter !== ALL_SECTIONS}
                activeEditId={activeEditId}
                onAdd={() => startCreate(cat)}
                onEdit={startEdit}
                onDelete={(capability) => {
                  void remove(capability);
                }}
              />
            );
          })}
        </div>
      </div>

      {editor ? (
        <CapabilityEditorPanel
          editor={editor}
          saving={saving}
          onChange={(draft) => setEditor({ ...editor, draft })}
          onCancel={() => setEditor(null)}
          onSave={() => {
            void saveEditor();
          }}
        />
      ) : null}
    </div>
  );
}

function CapabilitySummaryCards({ capabilities }: { capabilities: Capability[] }) {
  const counts = countByCategory(capabilities);
  const cards = [
    { label: "Total capabilities", value: capabilities.length },
    { label: "Certifications", value: counts.get("Certifications") ?? 0 },
    { label: "Past projects", value: counts.get("Past projects") ?? 0 },
    { label: "Technical capabilities", value: counts.get("Technical") ?? 0 },
    { label: "Team & coverage capabilities", value: counts.get("Team & coverage") ?? 0 },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Capability summary">
      {cards.map((card) => (
        <div key={card.label} className="border border-border bg-surface px-4 py-3">
          <p className="label">{card.label}</p>
          <p className="mt-2 text-25 font-semibold leading-none text-ink tabular">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function CapabilitySearchFilters({
  query,
  sectionFilter,
  sectionOptions,
  onQueryChange,
  onSectionFilterChange,
}: {
  query: string;
  sectionFilter: string;
  sectionOptions: string[];
  onQueryChange: (value: string) => void;
  onSectionFilterChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 border border-border bg-surface-sunk p-3 md:grid-cols-[minmax(0,1fr)_16rem]">
      <label className="flex min-h-9 items-center gap-2 border border-border-strong bg-surface px-3">
        <Search size={16} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />
        <span className="sr-only">Search capabilities</span>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-9 min-w-0 flex-1 bg-transparent text-14 text-ink placeholder:text-ink-faint"
          placeholder="Search name, evidence, or description"
        />
      </label>

      <label className="flex min-h-9 items-center gap-2 border border-border-strong bg-surface px-3">
        <Filter size={16} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />
        <span className="sr-only">Filter by section</span>
        <select
          value={sectionFilter}
          onChange={(e) => onSectionFilterChange(e.target.value)}
          className="h-9 min-w-0 flex-1 bg-transparent text-14 text-ink"
        >
          {sectionOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function CapabilitySection({
  category,
  capabilities,
  unfilteredCount,
  isFiltered,
  activeEditId,
  onAdd,
  onEdit,
  onDelete,
}: {
  category: string;
  capabilities: Capability[];
  unfilteredCount: number;
  isFiltered: boolean;
  activeEditId: string | null;
  onAdd: () => void;
  onEdit: (capability: Capability) => void;
  onDelete: (capability: Capability) => void;
}) {
  const helper = SECTION_HELPERS[category] ?? "Reusable evidence for tender response drafting.";

  return (
    <section aria-labelledby={`capability-section-${slug(category)}`} className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-strong pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 id={`capability-section-${slug(category)}`} className="font-serif text-20 leading-tight text-ink">
              {category}
            </h3>
            <span className="label tabular">{unfilteredCount}</span>
          </div>
          <p className="mt-1 text-14 text-ink-muted">{helper}</p>
        </div>
        <button type="button" onClick={onAdd} className="btn" aria-label={`Add capability to ${category}`}>
          <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
          Add capability
        </button>
      </div>

      {capabilities.length > 0 ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {capabilities.map((capability) => (
            <CapabilityCard
              key={capability.id}
              capability={capability}
              active={activeEditId === capability.id}
              onEdit={() => onEdit(capability)}
              onDelete={() => onDelete(capability)}
            />
          ))}
        </ul>
      ) : (
        <div className="border border-border bg-surface px-4 py-5">
          <p className="text-14 font-medium text-ink">
            {isFiltered && unfilteredCount > 0 ? "No capabilities match the current filters." : "No capabilities added yet."}
          </p>
          <p className="mt-1 text-14 text-ink-muted">
            {isFiltered && unfilteredCount > 0 ? "Adjust the search or section filter." : "Add one to improve tender matching."}
          </p>
        </div>
      )}
    </section>
  );
}

function CapabilityCard({
  capability,
  active,
  onEdit,
  onDelete,
}: {
  capability: Capability;
  active: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={cn(
        "border bg-surface p-4 transition-colors duration-160 ease-out hover:bg-surface-sunk",
        active ? "border-accent" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <span className="inline-flex items-center gap-2 border border-border bg-surface-2 px-2 py-1 text-12 font-medium uppercase tracking-[0.06em] text-ink-muted">
            <span className="dot bg-accent" aria-hidden="true" />
            {capability.category}
          </span>
          <h4 className="text-16 font-semibold leading-snug text-ink">{capability.name}</h4>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={onEdit} className="btn" aria-label={`Edit ${capability.name}`}>
            <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
            Edit
          </button>
          <button type="button" onClick={onDelete} className="btn btn-ghost" aria-label={`Delete ${capability.name}`}>
            <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PreviewBlock label="Description" value={capability.description} fallback="No description recorded." />
        <PreviewBlock label="Evidence" value={capability.evidence} fallback="No evidence recorded." emphasized />
      </div>
    </li>
  );
}

function PreviewBlock({
  label,
  value,
  fallback,
  emphasized = false,
}: {
  label: string;
  value: string | null;
  fallback: string;
  emphasized?: boolean;
}) {
  const hasValue = Boolean(value?.trim());
  return (
    <div className={cn("space-y-1", emphasized ? "bg-surface-2 p-3" : "py-1")}>
      <p className="label">{label}</p>
      <p className={cn("mt-1 text-14 leading-5", hasValue ? "text-ink-2" : "text-ink-faint")}>
        {hasValue ? truncate(value, 170) : fallback}
      </p>
    </div>
  );
}

function CapabilityEditorPanel({
  editor,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  editor: EditorState;
  saving: boolean;
  onChange: (draft: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const title = editor.mode === "create" ? "Add capability" : "Edit capability";
  const actionLabel = editor.mode === "create" ? "Add capability" : "Save changes";

  return (
    <aside className="border border-border-strong bg-surface p-5 xl:sticky xl:top-6 xl:self-start" aria-label={title}>
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="label">{editor.draft.category}</p>
          <h3 className="mt-1 font-serif text-20 leading-tight text-ink">{title}</h3>
        </div>
        <button type="button" onClick={onCancel} className="btn btn-ghost" aria-label="Close capability editor">
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block space-y-2">
          <span className="label">Name</span>
          <input
            value={editor.draft.name}
            onChange={(e) => onChange({ ...editor.draft, name: e.target.value })}
            className="input"
            autoFocus
          />
        </label>

        <label className="block space-y-2">
          <span className="label">Evidence</span>
          <textarea
            value={editor.draft.evidence}
            onChange={(e) => onChange({ ...editor.draft, evidence: e.target.value })}
            className="input min-h-[7rem] text-14"
          />
        </label>

        <label className="block space-y-2">
          <span className="label">Description</span>
          <textarea
            value={editor.draft.description}
            onChange={(e) => onChange({ ...editor.draft, description: e.target.value })}
            className="input min-h-[9rem] text-14"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <button type="button" onClick={onCancel} className="btn">
          Cancel
        </button>
        <button type="button" onClick={onSave} disabled={saving || !editor.draft.name.trim()} className="btn btn-primary">
          <Save size={16} strokeWidth={1.5} aria-hidden="true" />
          {saving ? "Saving." : actionLabel}
        </button>
      </div>
    </aside>
  );
}

function groupByCategory(capabilities: Capability[]): Map<string, Capability[]> {
  const map = new Map<string, Capability[]>();
  for (const capability of capabilities) {
    if (!map.has(capability.category)) map.set(capability.category, []);
    map.get(capability.category)!.push(capability);
  }
  return map;
}

function countByCategory(capabilities: Capability[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const capability of capabilities) {
    map.set(capability.category, (map.get(capability.category) ?? 0) + 1);
  }
  return map;
}

function capabilityToDraft(capability: Capability): Draft {
  return {
    category: capability.category,
    name: capability.name,
    description: capability.description ?? "",
    evidence: capability.evidence ?? "",
  };
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function truncate(value: string | null, max: number): string {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}...`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
