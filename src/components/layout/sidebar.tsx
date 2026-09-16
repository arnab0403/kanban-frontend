import type { ComponentType } from "react";
import {
  Box,
  ChevronDown,
  Clock,
  Copy,
  Focus,
  GitPullRequest,
  Home,
  Inbox,
  Layers,
  MoreHorizontal,
  Navigation,
  Search,
  Shapes,
  SquarePen,
  Terminal,
  Zap,
} from "lucide-react";

type IconType = ComponentType<{ className?: string }>;

function NavItem({
  icon: Icon,
  label,
  badge,
  active,
}: {
  icon?: IconType;
  label: string;
  badge?: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${
        active ? "bg-task text-foreground" : "text-muted-foreground"
      }`}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      {badge && <span className="text-xs text-muted-foreground">{badge}</span>}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1 px-2 pt-4 pb-1 text-xs text-muted-foreground">
      {label}
      <ChevronDown className="size-3" />
    </div>
  );
}

export function Sidebar() {
  return (
    <aside
      aria-label="Sidebar"
      className="flex h-full flex-col overflow-y-auto bg-background px-3 py-3"
    >
      <div className="flex items-center gap-1.5 px-1 pb-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sky-500 text-[10px] font-semibold text-white">
          HT
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          Demo Workspace
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        <button
          type="button"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-task"
        >
          <Search className="size-4" />
        </button>
        <button
          type="button"
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-task text-foreground"
        >
          <SquarePen className="size-4" />
        </button>
      </div>

      <NavItem icon={Zap} label="Pulse" />
      <NavItem icon={Inbox} label="Inbox" badge="99+" />
      <NavItem icon={Focus} label="My issues" />
      <NavItem icon={GitPullRequest} label="Reviews" />
      <NavItem icon={Navigation} label="Agent" />

      <SectionLabel label="Workspace" />
      <NavItem icon={Box} label="Projects" />
      <NavItem icon={Layers} label="Views" />
      <NavItem icon={Shapes} label="Loops" />
      <NavItem icon={MoreHorizontal} label="More" />

      <SectionLabel label="Your teams" />
      <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground">
        <span className="flex size-4 shrink-0 items-center justify-center rounded bg-green-500 text-black">
          <Terminal className="size-3" />
        </span>
        <span className="flex-1 truncate">Demo Workspace</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </div>

      <div className="pl-3">
        <NavItem icon={Home} label="Home" />
        <NavItem icon={Copy} label="Issues" />
        <NavItem icon={Clock} label="Cycles" />
        <div className="ml-2 border-l border-border pl-2">
          <NavItem label="Current" active />
          <NavItem label="Upcoming" />
        </div>
        <NavItem icon={Box} label="Projects" />
        <NavItem icon={Layers} label="Views" />
      </div>
    </aside>
  );
}
