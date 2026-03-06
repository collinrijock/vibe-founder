import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FaIcon } from "@/components/ui/fa-icon";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { useEffect, useCallback } from "react";
import { ChatSidebar } from "@/components/sidebar/ChatSidebar";
import { BusinessSidebar } from "@/components/sidebar/BusinessSidebar";
import { AgentsSidebar } from "@/components/sidebar/AgentsSidebar";
import { ConnectionsSidebar } from "@/components/sidebar/ConnectionsSidebar";
import { AgentBar } from "@/components/workspace/AgentBar";
import { ContextPanel } from "@/components/workspace/ContextPanel";

type SidebarView = "chat" | "business" | "initiatives" | "agents" | "connections" | "metrics" | "settings";

const ACTIVITY_BAR_ITEMS: { view: SidebarView; icon: string; label: string }[] = [
  { view: "chat", icon: "fa-solid fa-comments", label: "Chat" },
  { view: "business", icon: "fa-solid fa-building", label: "Business" },
  { view: "initiatives", icon: "fa-solid fa-rocket", label: "Initiatives" },
  { view: "agents", icon: "fa-solid fa-robot", label: "Agents" },
  { view: "connections", icon: "fa-solid fa-plug", label: "Connections" },
  { view: "metrics", icon: "fa-solid fa-chart-line", label: "Metrics" },
  { view: "settings", icon: "fa-solid fa-gear", label: "Settings" },
];

function ActivityBar() {
  const { activeSidebarView, setActiveSidebarView, sidebarCollapsed, toggleSidebar } = useWorkspace();

  const handleClick = (view: SidebarView) => {
    if (activeSidebarView === view && !sidebarCollapsed) {
      toggleSidebar();
    } else {
      setActiveSidebarView(view);
      if (sidebarCollapsed) toggleSidebar();
    }
  };

  return (
    <div className="flex h-full w-12 shrink-0 flex-col items-center border-r py-2 bg-[var(--color-activity-bar)] border-[var(--color-panel-border)]">
      <div className="mb-3 flex h-10 w-10 items-center justify-center">
        <FaIcon icon="fa-solid fa-bolt" className="text-base text-primary" />
      </div>
      <div className="flex flex-1 flex-col items-center gap-1">
        {ACTIVITY_BAR_ITEMS.map(({ view, icon, label }) => (
          <button
            key={view}
            onClick={() => handleClick(view)}
            title={label}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              activeSidebarView === view && !sidebarCollapsed
                ? "text-foreground bg-white/10"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            {activeSidebarView === view && !sidebarCollapsed && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-foreground" />
            )}
            <FaIcon icon={icon} className="text-sm" />
          </button>
        ))}
      </div>
    </div>
  );
}

function SidebarContent() {
  const { activeSidebarView } = useWorkspace();

  switch (activeSidebarView) {
    case "chat":
      return <ChatSidebar />;
    case "business":
      return <BusinessSidebar />;
    case "agents":
      return <AgentsSidebar />;
    case "initiatives":
      return (
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Initiatives</h3>
          <p className="text-xs text-muted-foreground">No initiatives yet. Start one from a chat conversation.</p>
        </div>
      );
    case "connections":
      return <ConnectionsSidebar />;
    case "metrics":
      return (
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Metrics</h3>
          <p className="text-xs text-muted-foreground">Track key business metrics over time.</p>
        </div>
      );
    case "settings":
      return (
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Settings</h3>
          <p className="text-xs text-muted-foreground">Business DNA and preferences coming soon.</p>
        </div>
      );
    default:
      return null;
  }
}

function UserProfile() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="border-t border-[var(--color-panel-border)] px-3 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
          <FaIcon icon="fa-solid fa-user" className="text-xs text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">{user.name}</p>
        </div>
        <button
          onClick={logout}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Sign out"
        >
          <FaIcon icon="fa-solid fa-right-from-bracket" className="text-xs" />
        </button>
      </div>
    </div>
  );
}

export default function WorkspaceShell() {
  const { sidebarCollapsed, contextPanelCollapsed, toggleSidebar, toggleContextPanel, setCommandPaletteOpen } = useWorkspace();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "b" && !e.shiftKey) {
        e.preventDefault();
        toggleSidebar();
      }
      if (mod && e.key === "b" && e.shiftKey) {
        e.preventDefault();
        toggleContextPanel();
      }
      if (mod && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    },
    [toggleSidebar, toggleContextPanel, setCommandPaletteOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-workspace-bg)]">
      <ActivityBar />

      <aside
        className={cn(
          "shrink-0 flex flex-col border-r border-[var(--color-panel-border)] bg-[var(--color-sidebar-bg)] transition-[width] duration-200 overflow-hidden",
          sidebarCollapsed ? "w-0 border-r-0" : "w-64"
        )}
      >
        <div className="flex-1 overflow-hidden flex flex-col w-64">
          <SidebarContent />
        </div>
        <UserProfile />
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
        <AgentBar />
      </div>

      <aside
        className={cn(
          "shrink-0 border-l border-[var(--color-panel-border)] bg-[var(--color-context-panel-bg)] transition-[width] duration-200 overflow-hidden",
          contextPanelCollapsed ? "w-0 border-l-0" : "w-72"
        )}
      >
        <div className="w-72 h-full">
          <ContextPanel />
        </div>
      </aside>
    </div>
  );
}
