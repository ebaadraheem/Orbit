import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------- Button */

type ButtonVariant = "primary" | "neutral" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-[#0d1512] hover:bg-[#9fc7b6] active:bg-[#84ad9d] font-medium",
  neutral:
    "bg-[var(--raised)] text-[var(--text)] border border-[var(--line-strong)] hover:bg-[#252931] hover:border-[#3a3f48]",
  ghost: "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--raised)]",
  danger: "bg-[var(--clay)] text-[#1a0f0d] hover:bg-[#d48b7d] font-medium",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "neutral", size = "md", icon, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "no-drag inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none",
        size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-9 px-3.5 text-[13.5px]",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

/* ------------------------------------------------------------ IconButton */

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  size?: "sm" | "md";
}

export function IconButton({
  label,
  active,
  size = "md",
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "no-drag inline-flex items-center justify-center rounded-md transition-colors duration-150",
          size === "sm" ? "h-7 w-7" : "h-8 w-8",
          active
            ? "bg-[var(--raised)] text-[var(--accent)]"
            : "text-[var(--text-mute)] hover:text-[var(--text)] hover:bg-[var(--raised)]",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/* ---------------------------------------------------------------- Toggle */

interface ToggleProps {
  checked: boolean;
  onChange(value: boolean): void;
  label: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "no-drag relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40",
        checked ? "bg-[var(--accent-dim)]" : "bg-[#2b2f36]",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] h-[14px] w-[14px] rounded-full transition-all duration-200",
          checked ? "left-[17px] bg-[var(--accent)]" : "left-[3px] bg-[#767d87]",
        )}
      />
    </button>
  );
}

/* --------------------------------------------------------------- Tooltip */

export function Tooltip({
  content,
  children,
  side = "bottom",
}: {
  content: string;
  children: React.ReactElement;
  side?: "bottom" | "top" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    const el = ref.current?.firstElementChild;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const offsets = {
      bottom: { top: r.bottom + 8, left: r.left + r.width / 2 },
      top: { top: r.top - 30, left: r.left + r.width / 2 },
      right: { top: r.top + r.height / 2 - 12, left: r.right + 10 },
    };
    setPos(offsets[side]);
    setOpen(true);
  }, [side]);

  return (
    <>
      <span
        ref={ref}
        className="contents"
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            role="tooltip"
            style={{
              top: pos.top,
              left: pos.left,
              transform: side === "right" ? "none" : "translateX(-50%)",
            }}
            className="animate-fade pointer-events-none fixed z-[90] whitespace-nowrap rounded-md border border-[var(--line-strong)] bg-[#000] px-2 py-1 text-[11.5px] text-[var(--text-dim)] shadow-lg"
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ----------------------------------------------------------------- Modal */

export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  align = "center",
  className,
}: {
  open: boolean;
  onClose(): void;
  labelledBy?: string;
  children: ReactNode;
  align?: "center" | "top";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    // Focus the dialog so screen readers and the keyboard land inside it.
    requestAnimationFrame(() => ref.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key !== "Tab" || !ref.current) return;
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[80] flex justify-center bg-black/55 px-6",
        align === "center" ? "items-center" : "items-start pt-[14vh]",
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          "animate-pop w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] shadow-2xl shadow-black/60",
          className ?? "max-w-lg",
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* --------------------------------------------------------------- Popover */

export function Popover({
  trigger,
  children,
  align = "right",
  label,
}: {
  trigger: (props: { open: boolean; toggle(): void }) => React.ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchor = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    const width = 268;
    setPos({
      top: r.bottom + 8,
      left: align === "right" ? Math.max(12, r.right - width) : r.left,
    });
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !panel.current?.contains(e.target as Node) &&
        !anchor.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div ref={anchor} className="contents">
        {trigger({ open, toggle: () => setOpen((v) => !v) })}
      </div>
      {open &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-label={label}
            style={{ top: pos.top, left: pos.left, width: 268 }}
            className="animate-pop fixed z-[85] rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-3.5 shadow-2xl shadow-black/60"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ---------------------------------------------------------------- KeyCap */

export function KeyCap({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-[var(--line-strong)] bg-[#0f1114] px-1.5 py-[1px] font-mono text-[10.5px] leading-[16px] text-[var(--text-mute)]">
      {children}
    </kbd>
  );
}
