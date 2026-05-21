import { cn } from "@/lib/utils";

export type StatusKind =
  | "fully_covered"
  | "partially_covered"
  | "not_covered"
  | "unclear"
  | null
  | undefined;

const COLOR_VAR: Record<NonNullable<StatusKind>, string> = {
  fully_covered: "var(--status-covered)",
  partially_covered: "var(--status-partial)",
  not_covered: "var(--status-missing)",
  unclear: "var(--status-unclear)",
};

export const STATUS_LABEL: Record<NonNullable<StatusKind>, string> = {
  fully_covered: "Covered",
  partially_covered: "Partial",
  not_covered: "Missing",
  unclear: "Unclear",
};

export function StatusDot({
  status,
  ring,
  className,
}: {
  status: StatusKind;
  ring?: boolean;
  className?: string;
}) {
  const color = status ? COLOR_VAR[status] : "var(--ink-faint)";
  return (
    <span
      aria-hidden="true"
      className={cn("dot", ring && "dot--ring", className)}
      style={ring ? { color } : { background: color }}
    />
  );
}

export function StatusPill({ status }: { status: StatusKind }) {
  if (!status) {
    return (
      <span className="pill text-ink-muted">
        <span className="dot" style={{ background: "var(--ink-faint)" }} />
        Pending
      </span>
    );
  }
  const color = COLOR_VAR[status];
  return (
    <span className="pill" style={{ color }}>
      <span className="dot" style={{ background: color }} />
      {STATUS_LABEL[status]}
    </span>
  );
}
