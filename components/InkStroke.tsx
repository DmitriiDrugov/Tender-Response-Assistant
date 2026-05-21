/**
 * The "thinking" indicator from DESIGN.md — a 1.25px line drawn in repeatedly
 * with an exponential ease-out. Not a spinner.
 */
export function InkStroke({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`ink-stroke ${className}`}
      viewBox="0 0 24 8"
      role="presentation"
      aria-hidden="true"
    >
      <path d="M0 4 C 6 0, 18 8, 24 4" />
    </svg>
  );
}
