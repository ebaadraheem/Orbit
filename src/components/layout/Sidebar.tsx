import { Plus, Search, Settings as SettingsIcon, Shield } from "lucide-react";
import type { Conversation, OrbitState } from "../../types/orbit";
import { OrbitLogo } from "../agent/OrbitLogo";
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
  return (
    <nav
      aria-label="Sessions"
      className={cn(
        "relative shrink-0 overflow-hidden border-r border-[var(--line)] bg-[var(--shell)] transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[56px]" : "w-[240px]"
      )}
    >
      {/* --- COLLAPSED VIEW (Icons Only) --- */}
      <div
        className={cn(
          "absolute inset-0 flex w-[56px] flex-col items-center gap-1 py-3 transition-opacity duration-200",
          collapsed ? "opacity-100 delay-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="mb-2 flex h-8 w-8 items-center justify-center">
          <OrbitLogo state={state} size={26} />
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
      </div>

      {/* --- EXPANDED VIEW (Full Sidebar) --- */}
      <div
        className={cn(
          "absolute inset-0 flex w-[240px] flex-col transition-opacity duration-200",
          !collapsed ? "opacity-100 delay-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-3">
          <OrbitLogo state={state} size={28} />
          <div className="leading-tight">
            <p className="text-[13.5px] font-medium tracking-[-0.01em] text-[var(--text)]">Orbit</p>
            <p className="text-[11px] text-[var(--text-mute)]">Private computer assistant</p>
          </div>
        </div>

        <div className="space-y-1 px-2.5 pb-2">
          <button
            type="button"
            onClick={onNew}
            className="no-drag focus:outline-none flex w-full items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-[var(--raised)] px-2.5 py-1.5 text-[13px] text-[var(--text)] transition-colors duration-150 hover:border-[#3a3f48] hover:bg-[#252931]"
          >
            <Plus size={14} className="text-[var(--accent)]" />
            New task
          </button>
          <button
            type="button"
            onClick={onSearch}
            className="no-drag focus:outline-none flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-[var(--text-mute)] transition-colors duration-150 hover:bg-[var(--raised)] hover:text-[var(--text-dim)]"
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
                          "no-drag group relative flex focus:outline-none w-full flex-col items-start rounded-md px-2.5 py-[7px] text-left transition-colors duration-150",
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