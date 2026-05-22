import type { DraftStatus } from '@/lib/types';
import { InkStroke } from './InkStroke';

const BADGE: Record<DraftStatus, { dot: string; label: string; stroke?: true }> = {
  pending:    { dot: '#d0c6ab',  label: 'Queued' },
  generating: { dot: '#1b1c1c',               label: 'Generating', stroke: true },
  ready:      { dot: '#705d00', label: 'Ready' },
  blocked:    { dot: '#e9c400', label: 'Requires evidence' },
  failed:     { dot: '#ba1a1a', label: 'Failed' },
  skipped:    { dot: '#7e775f',      label: 'Skipped' },
};

export function DraftStatusBadge({ status }: { status: DraftStatus }) {
  const cfg = BADGE[status];
  return (
    <span className="hidden lg:inline-flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">
      <span className="dot flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
      {cfg.stroke ? <InkStroke className="ml-1" /> : null}
    </span>
  );
}
