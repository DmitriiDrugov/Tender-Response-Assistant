'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TenderFull } from '@/lib/types';
import { cn } from '@/lib/utils';

type StepState = 'pending' | 'active' | 'complete';
type Step = { id: string; label: string; state: StepState };

function deriveSteps(tender: TenderFull, opening: boolean): Step[] {
  const ext = tender.extraction_status;
  return [
    { id: 'upload',  label: 'Document uploaded',      state: 'complete' },
    { id: 'text',    label: 'Text extracted',         state: ext === 'complete' ? 'complete' : ext === 'running' ? 'active' : 'pending' },
    { id: 'reqs',    label: 'Requirements extracted', state: ext === 'complete' ? 'complete' : ext === 'running' ? 'active' : 'pending' },
    { id: 'opening', label: 'Opening analysis',       state: opening ? 'active' : 'pending' },
  ];
}

function StepRow({ step, completedAt }: { step: Step; completedAt?: string }) {
  if (step.state === 'complete') {
    return (
      <div className="w-full flex items-center justify-between p-4 bg-surface border border-on-surface/10">
        <div className="flex items-center gap-4 min-w-0">
          <span
            className="material-symbols-outlined text-primary flex-shrink-0"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 300", fontSize: '18px' }}
          >
            check_circle
          </span>
          <span className="font-label-md text-label-md uppercase text-on-surface truncate">{step.label}</span>
        </div>
        {completedAt && (
          <span className="font-data-md text-[10px] text-on-surface-variant/60 tabular-nums ml-4 flex-shrink-0">{completedAt}</span>
        )}
      </div>
    );
  }

  if (step.state === 'active') {
    return (
      <div className="w-full flex items-center justify-between p-4 bg-surface border-2 border-primary">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
            <div className="w-1.5 h-1.5 bg-primary rounded-full dot-pulse" />
          </div>
          <span className="font-label-md text-label-md uppercase text-primary truncate">{step.label}</span>
        </div>
        <div className="bg-primary/10 px-2 py-0.5 border border-primary/20 flex-shrink-0 ml-4">
          <span className="font-data-md text-[10px] text-primary">PROCESSING</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-between p-4 bg-surface-container-low border border-on-surface/10">
      <div className="flex items-center gap-4 opacity-40 min-w-0">
        <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
          <div className="w-1.5 h-1.5 border border-on-surface rounded-full" />
        </div>
        <span className="font-label-md text-label-md uppercase text-on-surface truncate">{step.label}</span>
      </div>
      <span className="font-data-md text-[10px] text-on-surface-variant/30 flex-shrink-0">PENDING</span>
    </div>
  );
}

const TAU = 15_000;

export function AnalysisProgressScreen({
  tender,
  onDismissed,
}: {
  tender: TenderFull;
  onDismissed: () => void;
}) {
  const [progress, setProgress]     = useState(0);
  const [phase, setPhase]           = useState<'waiting' | 'ready' | 'dismissing'>('waiting');
  const [elapsed, setElapsed]       = useState(0);
  const startRef                    = useRef(Date.now());
  const rafRef                      = useRef<number | null>(null);
  const onDismissedRef              = useRef(onDismissed);
  onDismissedRef.current            = onDismissed;
  const readyFiredRef               = useRef(false);

  const mountTime = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const mountTimeRef = useRef(mountTime);

  const [completedTimes, setCompletedTimes] = useState<Record<string, string>>({
    upload: mountTimeRef.current,
  });

  const statusTitle = phase === 'ready'
    ? 'Requirements extracted.'
    : 'Preparing tender analysis.';

  const steps = deriveSteps(tender, phase === 'ready');

  // Record timestamps when steps complete
  useEffect(() => {
    if (tender.extraction_status !== 'complete') return;
    const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setCompletedTimes(prev => {
      if (prev.text && prev.reqs) return prev;
      return { ...prev, text: prev.text ?? now, reqs: prev.reqs ?? now };
    });
  }, [tender.extraction_status]);

  // Optimistic progress animation (0 → 85% exponential deceleration)
  useEffect(() => {
    if (phase !== 'waiting') return;
    const tick = () => {
      const e = Date.now() - startRef.current;
      setProgress(85 * (1 - Math.exp(-e / TAU)));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  // Elapsed timer for metadata footer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
    return () => clearInterval(t);
  }, []);

  const handleReady = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPhase('ready');
    setProgress(100);
    const t1 = setTimeout(() => setPhase('dismissing'), 600);
    const t2 = setTimeout(() => onDismissedRef.current(), 1_000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // phase is intentionally excluded from deps: including it causes the cleanup
  // (which cancels the dismiss timers) to fire on the phase='ready' state update,
  // leaving the overlay frozen. readyFiredRef guards against double invocation.
  useEffect(() => {
    if (tender.extraction_status !== 'complete' || readyFiredRef.current) return;
    readyFiredRef.current = true;
    return handleReady();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tender.extraction_status, handleReady]);

  const sessionId = tender.id.slice(-8).toUpperCase();
  const elapsedDisplay = elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Analysis pipeline progress"
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-surface',
        'transition-[opacity,transform,filter] duration-300 ease-out',
        phase === 'dismissing' && 'opacity-0 scale-[0.98] blur-[2px]',
      )}
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(27,28,28,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(27,28,28,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      <div className="w-full max-w-md flex flex-col items-center text-center space-y-10 px-6">

        {/* Identity */}
        <div className="space-y-3">
          <h2 className="font-headline-md text-headline-md text-on-surface leading-tight">
            {tender.title}
          </h2>
          <p className="font-data-md text-data-md text-primary uppercase tracking-widest transition-opacity duration-500">
            {statusTitle}
          </p>
        </div>

        {/* 1px progress line, 240px wide */}
        <div
          className="w-[240px] h-px bg-outline-variant overflow-hidden relative"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="absolute inset-y-0 left-0 bg-primary"
            style={{
              width: `${progress}%`,
              transition: phase === 'ready' ? 'width 500ms ease-out' : undefined,
            }}
          />
        </div>

        {/* Steps */}
        <ol className="w-full flex flex-col items-stretch space-y-2 bg-on-surface/5 p-4 overflow-hidden" aria-label="Pipeline steps">
          {steps.map(step => (
            <li key={step.id}>
              <StepRow step={step} completedAt={completedTimes[step.id]} />
            </li>
          ))}
        </ol>

        {/* System metadata */}
        <div className="opacity-50 w-full">
          <div className="flex gap-8 border-t border-on-surface/10 pt-4">
            <div className="text-left">
              <p className="font-label-md text-[10px] uppercase text-on-surface-variant">Elapsed</p>
              <p className="font-data-md text-data-md tabular-nums">{elapsedDisplay}</p>
            </div>
            <div className="text-left">
              <p className="font-label-md text-[10px] uppercase text-on-surface-variant">Engine</p>
              <p className="font-data-md text-data-md">EXTRACT-V1</p>
            </div>
            <div className="text-left">
              <p className="font-label-md text-[10px] uppercase text-on-surface-variant">Session</p>
              <p className="font-data-md text-data-md">{sessionId}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
