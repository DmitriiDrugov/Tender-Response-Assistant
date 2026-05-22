'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TenderFull } from '@/lib/types';
import { InkStroke } from './InkStroke';
import { cn } from '@/lib/utils';

type StepState = 'pending' | 'active' | 'complete';
type Step = { label: string; state: StepState };

function deriveSteps(tender: TenderFull, opening: boolean): Step[] {
  const ext = tender.extraction_status;
  return [
    { label: 'Document uploaded',      state: 'complete' },
    { label: 'Text extracted',         state: ext === 'complete' ? 'complete' : ext === 'running' ? 'active' : 'pending' },
    { label: 'Requirements extracted', state: ext === 'complete' ? 'complete' : ext === 'running' ? 'active' : 'pending' },
    { label: 'Opening analysis',       state: opening ? 'active' : 'pending' },
  ];
}

const TAU = 15_000;

export function AnalysisProgressScreen({
  tender,
  onDismissed,
}: {
  tender: TenderFull;
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

  // Dismiss as soon as the first LLM response arrives (extraction complete).
  const handleReady = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPhase('ready');
    setProgress(100);
    const t1 = setTimeout(() => setPhase('dismissing'), 600);
    const t2 = setTimeout(() => onDismissedRef.current(), 1_000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (tender.extraction_status === 'complete' && phase === 'waiting') return handleReady();
  }, [tender.extraction_status, phase, handleReady]);

  const statusTitle = phase === 'ready'
    ? 'Requirements extracted.'
    : 'Preparing tender analysis.';

  const steps = deriveSteps(tender, phase === 'ready');

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Analysis pipeline progress"
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background',
        'transition-[opacity,transform,filter] duration-320 ease-out',
        phase === 'dismissing' && 'opacity-0 scale-[0.98] blur-[2px]',
      )}
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(27,28,28,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(27,28,28,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      <div className="w-full max-w-sm space-y-8 px-6">
        <div className="space-y-2">
          <h2 className="font-headline-md text-headline-md text-primary leading-tight">
            {tender.title}
          </h2>
          <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">
            {statusTitle}
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="h-px w-full bg-outline-variant overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-primary"
            style={{
              width: `${progress}%`,
              transition: phase === 'ready' ? 'width 500ms ease-out' : undefined,
            }}
          />
        </div>

        <ol className="space-y-3" aria-label="Pipeline steps">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-3">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background:
                    step.state === 'complete' ? '#705d00'
                    : step.state === 'active'  ? '#1b1c1c'
                    : '#d0c6ab',
                }}
              />
              <span
                className={cn(
                  'font-label-mono text-label-mono uppercase',
                  step.state === 'complete' ? 'text-primary' :
                  step.state === 'active'   ? 'text-on-surface font-bold' :
                  'text-outline',
                )}
              >
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
