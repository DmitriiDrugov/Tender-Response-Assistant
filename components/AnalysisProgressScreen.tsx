'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TenderFull } from '@/lib/types';
import { InkStroke } from './InkStroke';
import { cn } from '@/lib/utils';

type StepState = 'pending' | 'active' | 'complete';
type Step = { label: string; state: StepState };

function deriveSteps(tender: TenderFull, hasAnyDraft: boolean, opening: boolean): Step[] {
  const ext = tender.extraction_status;
  const mat = tender.matching_status;
  const dft = tender.drafting_status;
  return [
    { label: 'Document uploaded',       state: 'complete' },
    { label: 'Text extracted',          state: ext === 'complete' ? 'complete' : ext === 'running' ? 'active' : 'pending' },
    { label: 'Requirements extracted',  state: ext === 'complete' ? 'complete' : ext === 'running' ? 'active' : 'pending' },
    { label: 'Capabilities matched',    state: mat === 'complete' ? 'complete' : mat === 'running' ? 'active' : 'pending' },
    { label: 'Drafting first response', state: hasAnyDraft ? 'complete' : dft === 'running' ? 'active' : 'pending' },
    { label: 'Opening analysis',        state: opening ? 'active' : 'pending' },
  ];
}

const TAU = 15_000; // ms — exponential time constant; reaches ~85% at ~30s

export function AnalysisProgressScreen({
  tender,
  hasAnyDraft,
  onDismissed,
}: {
  tender: TenderFull;
  hasAnyDraft: boolean;
  onDismissed: () => void;
}) {
  const [progress, setProgress]   = useState(0);
  const [phase, setPhase]         = useState<'waiting' | 'ready' | 'dismissing'>('waiting');
  const startRef                  = useRef(Date.now());
  const rafRef                    = useRef<number | null>(null);
  const onDismissedRef            = useRef(onDismissed);
  onDismissedRef.current          = onDismissed;

  // Optimistic progress animation (0 → 85% with exponential deceleration)
  useEffect(() => {
    if (phase !== 'waiting') return;
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      setProgress(85 * (1 - Math.exp(-elapsed / TAU)));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  // When first draft arrives: snap to 100%, hold 600ms, then dismiss
  const handleReady = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPhase('ready');
    setProgress(100);
    const t1 = setTimeout(() => setPhase('dismissing'), 600);
    const t2 = setTimeout(() => onDismissedRef.current(), 1_000); // 600ms hold + 320ms transition + 80ms buffer
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (hasAnyDraft && phase === 'waiting') return handleReady();
  }, [hasAnyDraft, phase, handleReady]);

  const statusTitle = phase === 'ready'
    ? 'First response ready.'
    : 'Preparing tender analysis.';

  const steps = deriveSteps(tender, hasAnyDraft, phase === 'ready');

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Analysis pipeline progress"
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-paper',
        'transition-[opacity,transform,filter] duration-320 ease-out',
        phase === 'dismissing' && 'opacity-0 scale-[0.98] blur-[2px]',
      )}
    >
      <div className="w-full max-w-sm space-y-7 px-6">
        <div className="space-y-3">
          <h2 className="font-serif text-25 text-ink leading-tight max-w-reading">
            {tender.title}
          </h2>
          <p className="font-serif text-20 text-ink-2">{statusTitle}</p>
        </div>

        {/* Progress bar — exception to DESIGN.md "no progress bar" rule, scoped here only */}
        <div
          className="h-0.5 w-60 bg-border-strong overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-ink"
            style={{
              width: `${progress}%`,
              transition: phase === 'ready' ? 'width 500ms ease-out' : undefined,
            }}
          />
        </div>

        {/* Step timeline */}
        <ol className="space-y-2" aria-label="Pipeline steps">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-3 text-14 text-ink-muted">
              <span
                className="dot flex-shrink-0"
                style={{
                  background:
                    step.state === 'complete' ? 'var(--status-covered)'
                    : step.state === 'active'  ? 'var(--ink)'
                    : 'var(--border-strong)',
                }}
              />
              <span className={step.state !== 'pending' ? 'text-ink-2' : undefined}>
                {step.label}
              </span>
              {step.state === 'active' ? <InkStroke className="ml-1" /> : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
