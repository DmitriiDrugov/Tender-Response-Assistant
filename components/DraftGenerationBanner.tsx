'use client';

import { useEffect, useRef, useState } from 'react';
import type { TenderFull } from '@/lib/types';
import { cn } from '@/lib/utils';

export function DraftGenerationBanner({
  tender,
  onDone,
}: {
  tender: TenderFull;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<'running' | 'completing' | 'collapsing'>('running');
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (tender.drafting_status !== 'complete' || phase !== 'running') return;
    setPhase('completing');
    const t1 = setTimeout(() => setPhase('collapsing'), 3_000);
    const t2 = setTimeout(() => onDoneRef.current(), 3_000 + 320);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [tender.drafting_status, phase]);

  const total = tender.drafting_progress_total;
  const done  = tender.drafting_progress_done;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const currentReq  = tender.requirements.find((r) => r.draft_status === 'generating');
  const currentText = currentReq
    ? currentReq.text.length > 60
      ? `${currentReq.text.slice(0, 60)}…`
      : currentReq.text
    : null;

  const barPct = phase === 'completing' || phase === 'collapsing' ? 100 : pct;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'border-b border-outline-variant bg-surface-container overflow-hidden',
        'transition-[max-height] duration-320 ease-out',
        phase === 'collapsing' ? 'max-h-0' : 'max-h-24',
      )}
    >
      {/* 2px progress bar at top — exception to DESIGN.md "no progress bar" rule */}
      <div className="h-0.5 bg-outline">
        <div
          className="h-full bg-ink"
          style={{
            width: `${barPct}%`,
            transition: phase === 'completing'
              ? 'width 300ms ease-out'
              : 'width 1s linear',
          }}
        />
      </div>

      {phase === 'completing' || phase === 'collapsing' ? (
        <div className="flex items-center gap-3 py-3 px-5">
          <span className="dot flex-shrink-0" style={{ background: '#705d00' }} />
          <span className="text-14 text-on-surface-variant">
            Analysis complete · All {done} responses processed
          </span>
        </div>
      ) : (
        <div className="flex items-baseline justify-between py-3 px-5">
          <div className="space-y-0.5">
            <p className="text-14 text-on-surface-variant">
              Drafting responses · {done} / {total}
            </p>
            {currentText ? (
              <p className="text-12 text-on-surface-variant">Currently drafting: {currentText}</p>
            ) : null}
          </div>
          <span className="shrink-0 pl-5 text-12 text-on-surface-variant tabular">
            {pct}% complete
          </span>
        </div>
      )}
    </div>
  );
}
