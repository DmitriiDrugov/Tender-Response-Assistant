"use client";

import { useId } from "react";

export type TabSpec = { key: string; label: string; count?: number; badge?: number };

/**
 * Segmented horizontal tabs with an underline on active. Keyboard:
 * left/right arrows move focus, Home/End jump, Enter/Space activates.
 */
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
      className="border-b border-border flex items-end gap-7"
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
              "relative pb-3 -mb-px flex items-center gap-2 text-14 transition-colors duration-160 ease-out",
              isActive ? "text-ink" : "text-ink-muted hover:text-ink-2",
            ].join(" ")}
          >
            <span className={isActive ? "font-medium" : ""}>{t.label}</span>
            {t.badge != null && t.badge > 0 ? (
              <span className="text-12 tabular text-accent font-medium">{t.badge}</span>
            ) : t.count != null ? (
              <span className="text-12 tabular text-ink-muted">{t.count}</span>
            ) : null}
            {isActive ? (
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 -bottom-px h-[2px] bg-ink"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
