import { useEffect, useRef, useState } from "react";
import { ArrowUp, Keyboard, Mic, RotateCcw, Square } from "lucide-react";
import type { OrbitState } from "../../types/orbit";
import { Button, IconButton, KeyCap, Toggle, cn } from "../ui";

interface Props {
  state: OrbitState;
  busy: boolean;
  continuous: boolean;
  onContinuous(on: boolean): void;
  onListen(): void;
  onStopListening(): void;
  onStop(): void;
  onSend(text: string): void;
  onRetry(): void;
}

export function VoiceControl({
  state,
  busy,
  continuous,
  onContinuous,
  onListen,
  onStopListening,
  onStop,
  onSend,
  onRetry,
}: Props) {
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typing) input.current?.focus();
  }, [typing]);

  const primary = () => {
    switch (state) {
      case "listening":
        return { label: "Listening", action: onStopListening, variant: "neutral" as const, icon: <Square size={12} fill="currentColor" /> };
      case "thinking":
        return { label: "Thinking", action: onStop, variant: "neutral" as const, icon: <Square size={12} fill="currentColor" /> };
      case "working":
        return { label: "Working", action: onStop, variant: "neutral" as const, icon: <Square size={12} fill="currentColor" /> };
      case "speaking":
        return { label: "Interrupt", action: onStop, variant: "neutral" as const, icon: <Square size={12} fill="currentColor" /> };
      case "waiting":
        return { label: "Waiting for your answer", action: () => {}, variant: "neutral" as const, icon: null, disabled: true };
      case "error":
        return { label: "Try again", action: onRetry, variant: "neutral" as const, icon: <RotateCcw size={14} /> };
      default:
        return { label: "Talk to Orbit", action: onListen, variant: "primary" as const, icon: <Mic size={15} /> };
    }
  };

  const button = primary();
  const listening = state === "listening";

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onSend(text);
  };

  return (
    <div className="border-t border-[var(--line)] bg-[var(--void)] px-6 pb-4 pt-3.5">
      {typing ? (
        <div className="mx-auto flex max-w-[640px] items-end gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-2 focus-within:border-[#3a4149]">
          <textarea
            ref={input}
            rows={1}
            value={draft}
            placeholder="Type instead"
            aria-label="Type a message to Orbit"
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 132)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
              if (e.key === "Escape") {
                e.stopPropagation();
                setTyping(false);
              }
            }}
            className="max-h-[132px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] text-[var(--text)] placeholder:text-[var(--text-mute)]"
          />
          <IconButton label="Back to voice" onClick={() => setTyping(false)} size="sm">
            <Mic size={14} />
          </IconButton>
          <Button
            size="sm"
            variant={draft.trim() ? "primary" : "neutral"}
            onClick={send}
            disabled={!draft.trim()}
            aria-label="Send"
            className="w-8 px-0"
          >
            <ArrowUp size={14} />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={button.action}
            disabled={button.disabled}
            aria-label={button.label}
            className={cn(
              "no-drag relative inline-flex h-11 min-w-[228px] items-center justify-center gap-2.5 rounded-full text-[14px] transition-all duration-200 disabled:opacity-50",
              button.variant === "primary"
                ? "bg-[var(--accent)] font-medium text-[#0d1512] hover:bg-[#9fc7b6]"
                : "border border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text)] hover:border-[#3d434c]",
              listening && "border-[var(--accent-dim)]",
            )}
          >
            {listening && (
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-[var(--accent)] opacity-40"
                style={{ animation: "orbit-breathe 2.4s ease-in-out infinite" }}
              />
            )}
            {button.icon}
            {button.label}
          </button>
          <IconButton label="Type instead" onClick={() => setTyping(true)}>
            <Keyboard size={15} />
          </IconButton>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-4 text-[11.5px] text-[var(--text-mute)]">
        <div className="flex items-center gap-2">
          <Toggle checked={continuous} onChange={onContinuous} label="Continuous listening" />
          <span className={continuous ? "text-[var(--text-dim)]" : undefined}>
            {continuous ? "Listening after every reply" : "Continuous listening off"}
          </span>
          {continuous && (
            <button
              type="button"
              onClick={() => {
                onContinuous(false);
                if (busy || listening) onStop();
              }}
              className="no-drag rounded px-1.5 py-[1px] text-[var(--accent)] hover:bg-[var(--raised)]"
            >
              Stop
            </button>
          )}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <span className="flex items-center gap-1.5">
            <KeyCap>Ctrl</KeyCap>
            <KeyCap>Space</KeyCap>
            hold to talk
          </span>
          <span className="flex items-center gap-1.5">
            <KeyCap>Esc</KeyCap>
            stop
          </span>
        </div>
      </div>
    </div>
  );
}
