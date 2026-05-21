import type { DraftStatus } from '@/lib/types';
import { InkStroke } from './InkStroke';

const BADGE: Record<DraftStatus, { dot: string; label: string; stroke?: true }> = {
  pending:    { dot: 'var(--border-strong)',  label: 'Queued' },
  generating: { dot: 'var(--ink)',            label: 'Generating', stroke: true },
  ready:      { dot: 'var(--status-covered)', label: 'Ready' },
  blocked:    { dot: 'var(--status-partial)', label: 'Requires evidence' },
  failed:     { dot: 'var(--status-missing)', label: 'Failed' },
  skipped:    { dot: 'var(--ink-faint)',      label: 'Skipped' },
};

export function DraftStatusBadge({ status }: { status: DraftStatus }) {
  const cfg = BADGE[status];
  return (
    <span className="hidden lg:inline-flex items-center gap-1.5 text-12 uppercase tracking-wider font-medium text-ink-muted whitespace-nowrap">
      <span className="dot flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
      {cfg.stroke ? <InkStroke className="ml-1" /> : null}
    </span>
  );
}
