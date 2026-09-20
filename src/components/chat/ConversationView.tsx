import { useEffect, useRef } from "react";
import { CornerDownLeft } from "lucide-react";
import type { OrbitSession } from "../../types/orbit";
import { Message } from "./Message";
import { ActiveTask } from "./ActiveTask";
import { PermissionRequest } from "./PermissionRequest";
import { scenarios } from "../../orbit/scenarios";
import { KeyCap, cn } from "../ui";

interface Props {
  session: OrbitSession;
  onStop(): void;
  onRetry(): void;
  onResolve(id: string, granted: boolean): void;
  onSuggestion(text: string): void;
}

export function ConversationView({ session, onStop, onRetry, onResolve, onSuggestion }: Props) {
  const end = useRef<HTMLDivElement>(null);
  const lastOrbitMessage = [...session.timeline]
    .reverse()
    .find((i) => i.kind === "message" && i.message.role === "orbit");

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session.timeline.length, session.state]);

  if (session.timeline.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center px-6 pb-6">
        <div className="w-full max-w-[560px]">
          <p className="mb-3 text-[12.5px] text-[var(--text-mute)]">Try asking Orbit to</p>
          <ul className="space-y-1.5">
            {scenarios.slice(0, 5).map((scenario) => (
              <li key={scenario.id}>
                <button
                  type="button"
                  onClick={() => onSuggestion(scenario.utterance)}
                  className="no-drag group flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-left text-[13.5px] text-[var(--text-dim)] transition-colors duration-150 hover:border-[var(--line-strong)] hover:bg-[var(--raised)] hover:text-[var(--text)]"
                >
                  {scenario.label}
                  <CornerDownLeft
                    size={13}
                    className="shrink-0 text-[var(--text-mute)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-1.5 text-[12px] text-[var(--text-mute)]">
            Everything here is simulated — press
            <KeyCap>Ctrl</KeyCap>
            <KeyCap>K</KeyCap>
            for the full command list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6 pt-1">
      <div className="mx-auto max-w-[640px]">
        {session.timeline.map((item) => {
          switch (item.kind) {
            case "message":
              return (
                <Message
                  key={item.id}
                  message={item.message}
                  speaking={session.state === "speaking" && item.id === lastOrbitMessage?.id}
                />
              );
            case "task":
              return (
                <ActiveTask key={item.id} task={item.task} onStop={onStop} onRetry={onRetry} />
              );
            case "permission":
              return (
                <PermissionRequest
                  key={item.id}
                  request={item.request}
                  onResolve={(granted) => onResolve(item.request.id, granted)}
                />
              );
            case "notice":
              return (
                <p
                  key={item.id}
                  className={cn(
                    "animate-fade my-2.5 flex items-center gap-2 text-[12.5px]",
                    item.tone === "error" ? "text-[var(--clay)]" : "text-[var(--text-mute)]",
                  )}
                >
                  <span className="h-px w-5 bg-[var(--line-strong)]" />
                  {item.text}
                </p>
              );
            default:
              return null;
          }
        })}
        <div ref={end} className="h-2" />
      </div>
    </div>
  );
}
