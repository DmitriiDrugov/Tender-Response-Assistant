"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ClarificationQuestion, ClarificationStatus, ClarificationPriority } from "@/lib/types";

const STATUS_LABEL: Record<ClarificationStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  sent: "Sent",
  not_needed: "Not needed",
};

const STATUS_COLOR: Record<ClarificationStatus, string> = {
  draft: "#e9c400",
  approved: "#7e775f",
  sent: "#705d00",
  not_needed: "#d0c6ab",
};

const PRIORITY_LABEL: Record<ClarificationPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_COLOR: Record<ClarificationPriority, string> = {
  high: "#ba1a1a",
  medium: "#7e775f",
  low: "#d0c6ab",
};

export function ClarificationsTab({
  tenderId,
  questions: initialQuestions,
  onQuestionsChange,
}: {
  tenderId: string;
  questions: ClarificationQuestion[];
  onQuestionsChange: (qs: ClarificationQuestion[]) => void;
}) {
  const [questions, setQuestions] = useState<ClarificationQuestion[]>(initialQuestions);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newPriority, setNewPriority] = useState<ClarificationPriority>("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function sync(next: ClarificationQuestion[]) {
    setQuestions(next);
    onQuestionsChange(next);
  }

  async function addQuestion() {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/clarifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_text: newText.trim(), priority: newPriority }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(d?.error ?? "Failed to add.");
        return;
      }
      const created = (await res.json()) as ClarificationQuestion;
      sync([...questions, created]);
      setNewText("");
      setAdding(false);
      setError(null);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function patchQuestion(id: string, fields: Partial<ClarificationQuestion>) {
    const res = await fetch(`/api/clarification-questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as ClarificationQuestion;
    sync(questions.map((q) => (q.id === updated.id ? updated : q)));
  }

  async function deleteQuestion(id: string) {
    const res = await fetch(`/api/clarification-questions/${id}`, { method: "DELETE" });
    if (res.ok) sync(questions.filter((q) => q.id !== id));
  }

  const active = questions.filter((q) => q.status !== "not_needed");
  const inactive = questions.filter((q) => q.status === "not_needed");

  return (
    <section aria-label="Clarification questions">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="font-serif text-25 text-on-surface leading-none">Clarification questions</h2>
        <div className="flex items-center gap-5">
          <span className="text-12 text-on-surface-variant tabular">{active.length} active</span>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="industrial-border px-4 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-variant transition-colors"
          >
            <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
            Add question
          </button>
        </div>
      </div>

      {adding ? (
        <div className="border border-outline-variant p-4 mb-5 space-y-3">
          <p className="label">New clarification question</p>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Please clarify whether..."
            className="w-full min-h-[4rem] bg-surface border border-outline px-3 py-2 text-14 text-on-surface focus:outline-none focus:border-on-surface"
            aria-label="Question text"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-13 text-on-surface-variant">
              <span className="label">Priority</span>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as ClarificationPriority)}
                className="h-8 px-2 bg-surface border border-outline text-13 text-on-surface"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <button
              type="button"
              onClick={addQuestion}
              disabled={saving || !newText.trim()}
              className="bg-primary text-on-primary px-4 py-2 font-label-md text-label-md hover:brightness-110 transition-all"
            >
              {saving ? "Adding." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewText(""); }}
              className="industrial-border px-4 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
          </div>
          {error ? <p role="alert" className="text-12 text-error">{error}</p> : null}
        </div>
      ) : null}

      {questions.length === 0 ? (
        <p className="text-14 text-on-surface-variant py-7">
          No clarification questions. Add questions for unclear or risky requirements before the clarification deadline.
        </p>
      ) : (
        <ul className="border-t border-outline-variant divide-y divide-outline-variant">
          {active.map((q) => (
            <QuestionRow key={q.id} question={q} onPatch={(f) => void patchQuestion(q.id, f)} onDelete={() => void deleteQuestion(q.id)} />
          ))}
          {inactive.length > 0 ? (
            <li className="py-3">
              <p className="text-12 text-on-surface-variant uppercase tracking-wider mb-2">Not needed ({inactive.length})</p>
              {inactive.map((q) => (
                <QuestionRow key={q.id} question={q} onPatch={(f) => void patchQuestion(q.id, f)} onDelete={() => void deleteQuestion(q.id)} />
              ))}
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

function QuestionRow({
  question: q,
  onPatch,
  onDelete,
}: {
  question: ClarificationQuestion;
  onPatch: (fields: Partial<ClarificationQuestion>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(q.question_text);

  function saveText() {
    if (text.trim() && text !== q.question_text) onPatch({ question_text: text.trim() });
    setEditing(false);
  }

  return (
    <li className={["py-4 space-y-2", q.status === "not_needed" ? "opacity-50" : ""].join(" ")}>
      <div className="flex items-start gap-3">
        <span
          className="dot flex-shrink-0 mt-1.5"
          style={{ background: PRIORITY_COLOR[q.priority] }}
          title={`Priority: ${PRIORITY_LABEL[q.priority]}`}
        />
        <div className="flex-1 min-w-0">
          {editing ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={saveText}
              className="w-full min-h-[4rem] bg-surface border border-outline px-3 py-2 text-14 text-on-surface focus:outline-none focus:border-on-surface"
              aria-label="Edit question"
            />
          ) : (
            <p
              className="text-14 text-on-surface leading-snug cursor-text"
              onClick={() => setEditing(true)}
              title="Click to edit"
            >
              {q.question_text}
            </p>
          )}
          {q.reason ? (
            <p className="text-12 text-on-surface-variant mt-1">
              <span className="label mr-1.5">Reason</span>
              {q.reason}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={q.status}
            onChange={(e) => onPatch({ status: e.target.value as ClarificationStatus })}
            className="h-7 px-2 bg-surface border border-outline-variant text-12 text-on-surface"
            aria-label="Question status"
          >
            {(Object.entries(STATUS_LABEL) as [ClarificationStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-on-surface-variant hover:text-primary transition-colors"
            aria-label="Delete question"
          >
            <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 text-12 ml-5">
        <span style={{ color: PRIORITY_COLOR[q.priority] }}>
          {PRIORITY_LABEL[q.priority]} priority
        </span>
        <span style={{ color: STATUS_COLOR[q.status] }}>
          {STATUS_LABEL[q.status]}
        </span>
        <select
          value={q.priority}
          onChange={(e) => onPatch({ priority: e.target.value as ClarificationPriority })}
          className="h-6 px-1 bg-transparent border-0 text-12 text-on-surface-variant"
          aria-label="Change priority"
        >
          <option value="high">High priority</option>
          <option value="medium">Medium priority</option>
          <option value="low">Low priority</option>
        </select>
      </div>
    </li>
  );
}
