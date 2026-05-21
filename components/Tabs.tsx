"use client";

import { useId } from "react";

export type TabSpec = { key: string; label: string; count?: number; badge?: number };

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabSpec[];
  active: string;
  onChange: (key: string) => void;
}) {
  const groupId = useId();

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const idx = tabs.findIndex((t) => t.key === active);
    if (idx < 0) return;
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    const t = tabs[next];
    if (t) onChange(t.key);
  }

  return (
    <div
      role="tablist"
      aria-label="Tender views"
      onKeyDown={onKeyDown}
      className="flex gap-8 overflow-x-auto border-b border-outline-variant/30 pt-2"
      style={{ scrollbarWidth: "none" }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            id={`${groupId}-tab-${t.key}`}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(t.key)}
            className={[
              "relative pb-2 -mb-px flex items-center gap-2 font-body-md text-body-md whitespace-nowrap transition-colors",
              isActive
                ? "text-primary font-bold border-b-2 border-primary"
                : "text-on-surface-variant hover:text-primary",
            ].join(" ")}
          >
            <span>{t.label}</span>
            {t.badge != null && t.badge > 0 ? (
              <span className="bg-error text-on-error px-1.5 py-0.5 text-[10px] font-bold rounded-none">
                {t.badge}
              </span>
            ) : t.count != null ? (
              <span className="text-[10px] text-on-surface-variant/60">{t.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
