import { Plus, Search, Settings as SettingsIcon, Shield } from "lucide-react";
import type { Conversation, OrbitState } from "../../types/orbit";
import { OrbitCore } from "../orbit/OrbitCore";
import { IconButton, KeyCap, cn } from "../ui";

interface Props {
  collapsed: boolean;
  conversations: Conversation[];
  activeId: string | null;
  state: OrbitState;
  onSelect(id: string): void;
  onNew(): void;
  onSearch(): void;
  onSettings(): void;
  onPrivacy(): void;
}

const groups = ["Today", "Yesterday", "Earlier"] as const;

export function Sidebar({
  collapsed,
  conversations,
  activeId,
  state,
  onSelect,
  onNew,
  onSearch,
  onSettings,
  onPrivacy,
}: Props) {
  if (collapsed) {
    return (
      <nav
        aria-label="Sessions"
        className="flex w-[56px] shrink-0 flex-col items-center gap-1 border-r border-[var(--line)] bg-[var(--shell)] py-3"
      >
        <div className="mb-2 flex h-8 w-8 items-center justify-center">
          <OrbitCore state={state} size={26} />
        </div>
        <IconButton label="New task" onClick={onNew}>
          <Plus size={16} />
        </IconButton>
        <IconButton label="Search sessions" onClick={onSearch}>
          <Search size={15} />
        </IconButton>
        <div className="flex-1" />
        <IconButton label="Privacy" onClick={onPrivacy}>
          <Shield size={15} />
        </IconButton>
        <IconButton label="Settings" onClick={onSettings}>
          <SettingsIcon size={15} />
        </IconButton>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Sessions"
      className="flex w-[240px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--shell)]"
    >
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-3">
        <OrbitCore state={state} size={28} />
        <div className="leading-tight">
          <p className="text-[13.5px] font-medium tracking-[-0.01em] text-[var(--text)]">Orbit</p>
          <p className="text-[11px] text-[var(--text-mute)]">Private computer assistant</p>
        </div>
      </div>

      <div className="space-y-1 px-2.5 pb-2">
        <button
          type="button"
          onClick={onNew}
          className="no-drag flex w-full items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-[var(--raised)] px-2.5 py-1.5 text-[13px] text-[var(--text)] transition-colors duration-150 hover:border-[#3a3f48] hover:bg-[#252931]"
        >
          <Plus size={14} className="text-[var(--accent)]" />
          New task
        </button>
        <button
          type="button"
          onClick={onSearch}
          className="no-drag flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-[var(--text-mute)] transition-colors duration-150 hover:bg-[var(--raised)] hover:text-[var(--text-dim)]"
        >
          <Search size={14} />
          Search
          <span className="ml-auto flex gap-1">
            <KeyCap>Ctrl</KeyCap>
            <KeyCap>K</KeyCap>
          </span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
        {groups.map((group) => {
          const items = conversations.filter((c) => c.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="mb-3">
              <h2 className="px-2.5 pb-1 pt-2 text-[11px] text-[var(--text-mute)]">{group}</h2>
              <ul>
                {items.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      aria-current={activeId === conversation.id ? "true" : undefined}
                      className={cn(
                        "no-drag group relative flex w-full flex-col items-start rounded-md px-2.5 py-[7px] text-left transition-colors duration-150",
                        activeId === conversation.id
                          ? "bg-[var(--raised)]"
                          : "hover:bg-[#1b1e23]",
                      )}
                    >
                      {activeId === conversation.id && (
                        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[var(--accent)]" />
                      )}
                      <span
                        className={cn(
                          "w-full truncate text-[13px]",
                          activeId === conversation.id
                            ? "text-[var(--text)]"
                            : "text-[var(--text-dim)]",
                        )}
                      >
                        {conversation.title}
                      </span>
                      <span className="w-full truncate text-[11.5px] text-[var(--text-mute)]">
                        {conversation.taskCount === 1
                          ? "1 task"
                          : `${conversation.taskCount} tasks`}
                        {" · "}
                        {conversation.preview}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--line)] px-2.5 py-2">
        <SidebarLink icon={<SettingsIcon size={14} />} label="Settings" onClick={onSettings} />
        <SidebarLink icon={<Shield size={14} />} label="Privacy" onClick={onPrivacy} />
      </div>
    </nav>
  );
}

function SidebarLink({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="no-drag flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-[var(--text-mute)] transition-colors duration-150 hover:bg-[var(--raised)] hover:text-[var(--text-dim)]"
    >
      {icon}
      {label}
    </button>
  );
}
