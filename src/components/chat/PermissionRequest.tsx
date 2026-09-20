import { useEffect, useRef } from "react";
import { Check, ShieldAlert, Terminal, Trash2, X } from "lucide-react";
import type { PermissionRequest as Request } from "../../types/orbit";
import { Button, cn } from "../ui";

const icons = {
  normal: Check,
  elevated: Terminal,
  destructive: Trash2,
} as const;

interface Props {
  request: Request;
  onResolve(granted: boolean): void;
}

/**
 * Not a browser permission prompt: it sits inline in the conversation, in
 * Orbit's own voice, and says plainly what will happen.
 */
export function PermissionRequest({ request, onResolve }: Props) {
  const confirm = useRef<HTMLButtonElement>(null);
  const resolved = request.resolution;
  const Icon = icons[request.risk];
  const destructive = request.risk === "destructive";

  useEffect(() => {
    if (!resolved) confirm.current?.focus();
  }, [resolved]);

  if (resolved) {
    return (
      <p className="animate-fade my-2 flex items-center gap-2 text-[12.5px] text-[var(--text-mute)] ">
        {resolved === "granted" ? (
          <Check size={12} className="text-[var(--accent)]" />
        ) : (
          <X size={12} />
        )}
        {resolved === "granted" ? "You allowed" : "You declined"}
        <span className="text-[var(--text-dim)]">{request.title.replace(/\?$/, "")}</span>
      </p>
    );
  }

  return (
    <section
      aria-label="Orbit needs permission"
      className={cn(
        "animate-rise my-3 overflow-hidden rounded-lg border bg-[var(--surface)]",
        destructive ? "border-[#4a3730]" : "border-[#3d382c]",
      )}
    >
      <span
        aria-hidden="true"
        className="block h-[2px] w-full"
        style={{ background: destructive ? "var(--clay)" : "var(--amber)" }}
      />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-[1px] flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
              destructive ? "bg-[#2a1d1a] text-[var(--clay)]" : "bg-[#282318] text-[var(--amber)]",
            )}
          >
            <Icon size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14.5px] font-medium text-[var(--text)]" data-selectable>
              {request.title}
            </h3>
            <p className="mt-1 text-[13px] text-[var(--text-dim)]" data-selectable>
              {request.summary}
            </p>

            {request.literal && (
              <pre
                data-selectable
                className="mt-3 overflow-x-auto whitespace-pre rounded-md border border-[var(--line)] bg-[#0f1114] px-3 py-2.5 font-mono text-[12px] leading-[20px] text-[var(--text)]"
              >
                {request.literal}
              </pre>
            )}

            {request.consequence && (
              <p className="mt-2.5 flex items-start gap-1.5 text-[12px] text-[var(--text-mute)]">
                <ShieldAlert size={12} className="mt-[3px] shrink-0" />
                {request.consequence}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2">
              <Button
                ref={confirm}
                variant={destructive ? "danger" : "primary"}
                size="sm"
                onClick={() => onResolve(true)}
              >
                {request.confirmLabel}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onResolve(false)}>
                Cancel
              </Button>
              <span className="ml-auto text-[11.5px] text-[var(--text-mute)]">
                Orbit is waiting
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
