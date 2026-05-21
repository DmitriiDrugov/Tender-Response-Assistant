import { cn } from "@/lib/utils";

export type StatusKind =
  | "fully_covered"
  | "partially_covered"
  | "not_covered"
  | "unclear"
  | null
  | undefined;

const STATUS_COLOR: Record<NonNullable<StatusKind>, string> = {
  fully_covered:     "#705d00",
  partially_covered: "#e9c400",
  not_covered:       "#ba1a1a",
  unclear:           "#7e775f",
};

export const STATUS_LABEL: Record<NonNullable<StatusKind>, string> = {
  fully_covered:     "Covered",
  partially_covered: "Partial",
  not_covered:       "Missing",
  unclear:           "Unclear",
};

export function StatusDot({
  status,
  className,
}: {
  status: StatusKind;
  ring?: boolean;
  className?: string;
}) {
  const color = status ? STATUS_COLOR[status] : "#d0c6ab";
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block w-1.5 h-1.5 rounded-full flex-shrink-0", className)}
      style={{ background: color }}
    />
  );
}

export function StatusPill({ status }: { status: StatusKind }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-outline" />
        Pending
      </span>
    );
  }
  const color = STATUS_COLOR[status];
  return (
    <span className="inline-flex items-center gap-1.5 font-label-md text-label-md" style={{ color }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {STATUS_LABEL[status]}
    </span>
  );
}
