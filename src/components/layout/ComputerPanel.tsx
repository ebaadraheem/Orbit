import {
  AppWindow,
  Check,
  Eye,
  FileText,
  Keyboard,
  Monitor,
  MousePointer2,
  Terminal,
  Timer,
  X,
} from "lucide-react";
import type { Activity, ActivityType, ComputerState, CompletedTask } from "../../types/orbit";
import { Toggle, cn } from "../ui";
import { relativeTime } from "../../lib/hooks";

const activityIcon: Record<ActivityType, typeof AppWindow> = {
  application: AppWindow,
  keyboard: Keyboard,
  mouse: MousePointer2,
  screen: Monitor,
  file: FileText,
  terminal: Terminal,
  system: Timer,
};

const controlWord: Record<NonNullable<ComputerState["control"]>, string> = {
  keyboard: "Orbit is using the keyboard",
  mouse: "Orbit is using the mouse",
  reading: "Orbit is reading the screen",
  waiting: "Orbit is waiting for the application",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--line)] px-4 py-3.5 last:border-b-0">
      <h2 className="mb-2.5 text-[11.5px] font-medium text-[var(--text-mute)]">{title}</h2>
      {children}
    </section>
  );
}

interface Props {
  computer: ComputerState;
  activity: Activity[];
  history: CompletedTask[];
  onScreenAwareness(on: boolean): void;
}

export function ComputerPanel({ computer, activity, history, onScreenAwareness }: Props) {
  const recent = [...activity].reverse().slice(0, 7);

  return (
    <aside
      aria-label="Computer activity"
      className="flex w-[292px] shrink-0 flex-col overflow-y-auto border-l border-[var(--line)] bg-[var(--shell)]"
    >
      <Section title="Computer">
        {computer.control ? (
          <p className="mb-2.5 flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 text-[12.5px] text-[var(--text)]">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
              style={{ animation: "fade 1.4s ease-in-out infinite alternate" }}
            />
            {controlWord[computer.control]}
          </p>
        ) : (
          <p className="mb-2.5 text-[12.5px] text-[var(--text-mute)]">
            Orbit isn't touching the computer.
          </p>
        )}

        {computer.apps.length > 0 ? (
          <ul className="space-y-[3px]">
            {computer.apps.map((app) => (
              <li
                key={app.name}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[12.5px]"
              >
                <AppWindow
                  size={13}
                  className={
                    app.state === "active" ? "text-[var(--accent)]" : "text-[var(--text-mute)]"
                  }
                />
                <span
                  className={
                    app.state === "active" ? "text-[var(--text)]" : "text-[var(--text-dim)]"
                  }
                >
                  {app.name}
                </span>
                {app.state !== "open" && (
                  <span className="ml-auto text-[11px] text-[var(--text-mute)]">
                    {app.state === "active" ? "in front" : "starting"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-[var(--text-mute)]">No applications opened by Orbit.</p>
        )}
      </Section>

      <Section title="Tool activity">
        {recent.length === 0 ? (
          <p className="text-[12px] text-[var(--text-mute)]">
            Actions Orbit takes will appear here as it works.
          </p>
        ) : (
          <ul className="space-y-[5px]">
            {recent.map((event) => {
              const Icon = activityIcon[event.type];
              return (
                <li key={event.id} className="flex items-start gap-2">
                  <span className="mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {event.status === "running" ? (
                      <span
                        className="h-[5px] w-[5px] rounded-full bg-[var(--accent)]"
                        style={{ animation: "fade 1.1s ease-in-out infinite alternate" }}
                      />
                    ) : event.status === "failed" ? (
                      <X size={11} className="text-[var(--clay)]" strokeWidth={2.5} />
                    ) : (
                      <Check size={11} className="text-[var(--accent-dim)]" strokeWidth={2.5} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-[12.5px]",
                        event.status === "running"
                          ? "text-[var(--text)]"
                          : "text-[var(--text-dim)]",
                      )}
                    >
                      <Icon size={11} className="shrink-0 text-[var(--text-mute)]" />
                      <span className="truncate">{event.label}</span>
                    </span>
                    {event.detail && (
                      <span className="block truncate pl-[18px] text-[11.5px] text-[var(--text-mute)]">
                        {event.detail}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Screen awareness">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12.5px] text-[var(--text-dim)]">
            {computer.screenAwareness
              ? "Orbit can look at your screen when a task needs it."
              : "Orbit can't see your screen."}
          </p>
          <Toggle
            checked={computer.screenAwareness}
            onChange={onScreenAwareness}
            label="Screen awareness"
          />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[var(--text-mute)]">
          <Eye size={11} />
          {computer.screenAwareness ? "On for this session" : "Off"}
        </p>
      </Section>

      <Section title="Recent activity">
        {history.length === 0 ? (
          <p className="text-[12px] text-[var(--text-mute)]">Nothing yet today.</p>
        ) : (
          <ul className="space-y-1.5">
            {history.slice(0, 6).map((entry) => (
              <li key={entry.id + entry.at} className="flex items-start gap-2 text-[12.5px]">
                {entry.status === "completed" ? (
                  <Check size={12} className="mt-[4px] shrink-0 text-[var(--accent-dim)]" strokeWidth={2.5} />
                ) : (
                  <X size={12} className="mt-[4px] shrink-0 text-[var(--text-mute)]" strokeWidth={2.5} />
                )}
                <span className="min-w-0 flex-1 truncate text-[var(--text-dim)]">{entry.title}</span>
                <span className="shrink-0 text-[11.5px] text-[var(--text-mute)]">
                  {relativeTime(entry.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </aside>
  );
}
