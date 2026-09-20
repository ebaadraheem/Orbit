import { useEffect, useMemo, useRef, useState } from "react";
import {
  History,
  Mic,
  MicOff,
  Monitor,
  Plus,
  Search,
  Settings as SettingsIcon,
  Shield,
  Square,
} from "lucide-react";
import type { Conversation } from "../../types/orbit";
import { scenarios } from "../../orbit/scenarios";
import { KeyCap, Modal, cn } from "../ui";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  section: string;
  icon: React.ReactNode;
  keys?: string[];
  run(): void;
}

interface Props {
  open: boolean;
  onClose(): void;
  conversations: Conversation[];
  busy: boolean;
  continuous: boolean;
  actions: {
    listen(phrase?: string): void;
    stop(): void;
    newTask(): void;
    openSettings(): void;
    openPrivacy(): void;
    toggleContinuous(): void;
    toggleRail(): void;
    selectConversation(id: string): void;
  };
}

export function CommandPalette({
  open,
  onClose,
  conversations,
  busy,
  continuous,
  actions,
}: Props) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const base: Command[] = [
      {
        id: "listen",
        label: "Start listening",
        section: "Orbit",
        icon: <Mic size={14} />,
        keys: ["Ctrl", "Space"],
        run: () => actions.listen(),
      },
      {
        id: "stop",
        label: busy ? "Stop what Orbit is doing" : "Stop listening",
        section: "Orbit",
        icon: <Square size={13} />,
        keys: ["Esc"],
        run: actions.stop,
      },
      {
        id: "continuous",
        label: continuous ? "Turn off continuous listening" : "Listen continuously",
        hint: continuous ? "Orbit stops re-opening the mic" : "Orbit listens after every reply",
        section: "Orbit",
        icon: continuous ? <MicOff size={14} /> : <Mic size={14} />,
        run: actions.toggleContinuous,
      },
      {
        id: "new",
        label: "New task",
        section: "Session",
        icon: <Plus size={14} />,
        run: actions.newTask,
      },
      {
        id: "rail",
        label: "Toggle computer activity",
        section: "Session",
        icon: <Monitor size={14} />,
        run: actions.toggleRail,
      },
      {
        id: "settings",
        label: "Open settings",
        section: "Session",
        icon: <SettingsIcon size={14} />,
        run: actions.openSettings,
      },
      {
        id: "privacy",
        label: "Open privacy settings",
        section: "Session",
        icon: <Shield size={14} />,
        run: actions.openPrivacy,
      },
    ];

    const tasks: Command[] = scenarios.map((scenario) => ({
      id: `run-${scenario.id}`,
      label: scenario.label,
      hint: "Ask Orbit",
      section: "Ask Orbit to",
      icon: <Mic size={14} />,
      run: () => actions.listen(scenario.utterance),
    }));

    const sessions: Command[] = conversations.map((conversation) => ({
      id: `open-${conversation.id}`,
      label: conversation.title,
      hint: conversation.preview,
      section: "Recent sessions",
      icon: <History size={14} />,
      run: () => actions.selectConversation(conversation.id),
    }));

    return [...base, ...tasks, ...sessions];
  }, [actions, busy, continuous, conversations]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((command) =>
      `${command.label} ${command.hint ?? ""} ${command.section}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const choose = (command?: Command) => {
    if (!command) return;
    onClose();
    // Let the dialog unmount before the action changes the view underneath.
    requestAnimationFrame(command.run);
  };

  let section = "";

  return (
    <Modal open={open} onClose={onClose} align="top" className="max-w-[560px] focus:outline-none" labelledBy="palette " >
      <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-4 ">
        <Search size={15} className="shrink-0 text-[var(--text-mute)]" />
        <input
          ref={inputRef}
          id="palette"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search commands and sessions"
          aria-label="Search commands and sessions"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-results"
          aria-activedescendant={results[index] ? `cmd-${results[index].id}` : undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => (i + 1) % Math.max(results.length, 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => (i - 1 + results.length) % Math.max(results.length, 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(results[index]);
            }
          }}
          className="h-12 flex-1 bg-transparent text-[14px] text-[var(--text)] placeholder:text-[var(--text-mute)] focus:outline-none"
        />
        <KeyCap>Esc</KeyCap>
      </div>

      <ul
        ref={listRef}
        id="palette-results"
        role="listbox"
        aria-label="Commands"
        className="max-h-[52vh] overflow-y-auto p-1.5"
      >
        {results.length === 0 && (
          <li className="px-3 py-6 text-center text-[13px] text-[var(--text-mute)]">
            Nothing matches that.
          </li>
        )}
        {results.map((command, i) => {
          const header = command.section !== section ? command.section : null;
          section = command.section;
          return (
            <li key={command.id}>
              {header && (
                <p className="px-2.5 pb-1 pt-3 text-[11px] text-[var(--text-mute)]">{header}</p>
              )}
              <button
                type="button"
                id={`cmd-${command.id}`}
                role="option"
                data-index={i}
                aria-selected={i === index}
                onMouseMove={() => setIndex(i)}
                onClick={() => choose(command)}
                className={cn(
                  "no-drag flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13.5px] transition-colors duration-100",
                  i === index
                    ? "bg-[var(--raised)] text-[var(--text)]"
                    : "text-[var(--text-dim)]",
                )}
              >
                <span className={i === index ? "text-[var(--accent)]" : "text-[var(--text-mute)]"}>
                  {command.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{command.label}</span>
                {command.hint && (
                  <span className="max-w-[40%] truncate text-[12px] text-[var(--text-mute)]">
                    {command.hint}
                  </span>
                )}
                {command.keys && (
                  <span className="flex gap-1">
                    {command.keys.map((key) => (
                      <KeyCap key={key}>{key}</KeyCap>
                    ))}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
