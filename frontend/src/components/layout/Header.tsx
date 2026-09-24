import { PanelLeft, PanelRight, Search, Settings as SettingsIcon } from "lucide-react";
import type { OrbitState, PrivacyMode } from "../../types/orbit";
import { StatusIndicator } from "./LLMModelStatus";
import { StateBadge } from "../agent/Stage";
import { IconButton } from "../ui";

interface Props {
  title: string;
  state: OrbitState;
  privacy: PrivacyMode;
  model: string;
  storeHistory: boolean;
  sidebarOpen: boolean;
  railOpen: boolean;
  onToggleSidebar(): void;
  onToggleRail(): void;
  onSearch(): void;
  // onSettings(): void;
  onPrivacy(): void;
}

export function Header({
  title,
  state,
  privacy,
  model,
  storeHistory,
  sidebarOpen,
  railOpen,
  onToggleSidebar,
  onToggleRail,
  onSearch,
  // onSettings,
  onPrivacy,
}: Props) {
  return (
    <header className="drag flex h-11 shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--shell)] px-2.5">
      <IconButton
        label={sidebarOpen ? "Hide sessions" : "Show sessions"}
        onClick={onToggleSidebar}
        active={sidebarOpen}
        size="sm"
      >
        <PanelLeft size={15} />
      </IconButton>

      <div className="flex min-w-0 items-center gap-2.5">
        <h1 className="truncate text-[13px] font-medium text-[var(--text-dim)]">{title}</h1>
        <StateBadge state={state} />
      </div>

      <div className="flex-1" />

      <IconButton label="Search and commands" onClick={onSearch} size="sm">
        <Search size={14} />
      </IconButton>
      <StatusIndicator
        mode={privacy}
        model={model}
        storeHistory={storeHistory}
        onOpenPrivacy={onPrivacy}
      />
      <IconButton
        label={railOpen ? "Hide activity" : "Show activity"}
        onClick={onToggleRail}
        active={railOpen}
        size="sm"
      >
        <PanelRight size={15} />
      </IconButton>
      {/* <IconButton label="Settings" onClick={onSettings} size="sm">
        <SettingsIcon size={15} />
      </IconButton> */}
    </header>
  );
}
