import { Square } from "lucide-react";
import type { OrbitState } from "../../types/orbit";
import { OrbitCore, stateColor, stateLabel } from "./OrbitCore";
import { Transcript } from "./Transcript";
import { Button, cn } from "../ui";

interface Props {
  state: OrbitState;
  transcript: string;
  /** Compact once the session has content, so the conversation gets the room. */
  compact: boolean;
  busy: boolean;
  onStop(): void;
}

const subtitle: Partial<Record<OrbitState, string>> = {
  idle: "Say what you need, or press the button below.",
  listening: "Go ahead.",
  thinking: "Working out what to do.",
  waiting: "Orbit needs your answer before it continues.",
  error: "The task stopped short.",
};

export function Stage({ state, transcript, compact, busy, onStop }: Props) {
  const label = stateLabel[state];

  if (compact) {
    return (
      <div className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--void)]/85 px-6 py-2.5 backdrop-blur">
        <OrbitCore state={state} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className="text-[13px] font-medium transition-colors duration-200"
              style={{ color: stateColor[state] }}
            >
              {label}
            </span>
            {transcript && <Transcript text={transcript} compact />}
          </div>
        </div>
        {busy && (
          <Button size="sm" variant="ghost" icon={<Square size={11} fill="currentColor" />} onClick={onStop}>
            Stop
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 pb-2 pt-12">
      <OrbitCore state={state} size={132} />
      <h1
        className="mt-5 text-[19px] font-medium tracking-[-0.01em] transition-colors duration-300"
        style={{ color: stateColor[state] }}
      >
        {label}
      </h1>
      <div className="mt-2 min-h-[58px]">
        {transcript ? (
          <Transcript text={transcript} />
        ) : (
          <p className="max-w-[44ch] text-center text-[13.5px] text-[var(--text-mute)]">
            {subtitle[state] ?? "Orbit is on it."}
          </p>
        )}
      </div>
    </div>
  );
}

export function StateBadge({ state }: { state: OrbitState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-[2px] text-[11.5px]",
        "border-[var(--line-strong)] bg-[var(--raised)]",
      )}
      style={{ color: stateColor[state] }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: stateColor[state] }}
      />
      {stateLabel[state]}
    </span>
  );
}
