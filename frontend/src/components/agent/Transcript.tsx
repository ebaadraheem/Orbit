import { cn } from "../ui";

/**
 * What Orbit is hearing, as it hears it. Deliberately not styled as an input:
 * the user is speaking, not filling in a field.
 */
export function Transcript({ text, compact }: { text: string; compact?: boolean }) {
  if (!text) return null;
  return (
    <p
      data-selectable
      aria-live="polite"
      className={cn(
        "animate-fade text-balance text-[var(--text)]",
        compact
          ? "max-w-[46ch] truncate text-[13px] text-[var(--text-dim)]"
          : "mx-auto max-w-[52ch] text-center text-[17px] leading-[1.5]",
      )}
    >
      {text}
      <span
        aria-hidden="true"
        className="ml-1 inline-block h-[1.05em] w-[2px] translate-y-[2px] bg-[var(--accent)] opacity-80"
        style={{ animation: "fade 900ms ease-in-out infinite alternate" }}
      />
    </p>
  );
}
