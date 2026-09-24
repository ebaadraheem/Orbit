import { Mic, Volume2 } from "lucide-react";
import type { Message as MessageModel } from "../../types/orbit";
import { cn } from "../ui";

export function Message({
  message,
  speaking,
}: {
  message: MessageModel;
  speaking?: boolean;
}) {
  const fromUser = message.role === "user";
  return (
    <article className="animate-rise py-2.5">
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className={cn(
            "text-[11.5px] font-medium",
            fromUser ? "text-[var(--text-mute)]" : "text-[var(--accent)]",
          )}
        >
          {fromUser ? "You" : "Orbit"}
        </span>
        {fromUser && message.via === "voice" && (
          <Mic size={10} className="text-[var(--text-mute)]" aria-label="Spoken" />
        )}
        {!fromUser && speaking && (
          <Volume2 size={11} className="text-[var(--accent)]" aria-label="Speaking now" />
        )}
      </div>
      <p
        data-selectable
        className={cn(
          "max-w-[68ch] text-[14.5px] leading-[1.62]",
          fromUser ? "text-[var(--text)]" : "text-[var(--text-dim)]",
        )}
      >
        {message.text}
        {message.interrupted && (
          <span className="ml-1 text-[var(--text-mute)]">— cut off</span>
        )}
      </p>
    </article>
  );
}
