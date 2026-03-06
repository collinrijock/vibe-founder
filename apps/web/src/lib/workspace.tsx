import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type SidebarView = "chat" | "business" | "initiatives" | "agents" | "connections" | "metrics" | "settings";

type WorkspaceTabType =
  | "chat"
  | "business_overview"
  | "plan_aspect"
  | "initiative"
  | "agent_run"
  | "agent_config"
  | "connections"
  | "metrics"
  | "business_dna"
  | "pipeline"
  | "content";

interface WorkspaceTab {
  id: string;
  type: WorkspaceTabType;
  label: string;
  icon: string;
  data: Record<string, unknown>;
  closeable: boolean;
  dirty: boolean;
}

interface WorkspaceState {
  activeSidebarView: SidebarView;
  setActiveSidebarView: (view: SidebarView) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  contextPanelCollapsed: boolean;
  toggleContextPanel: () => void;
  agentBarExpanded: boolean;
  toggleAgentBar: () => void;
  setAgentBarExpanded: (expanded: boolean) => void;
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  openTab: (tab: Omit<WorkspaceTab, "dirty">) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeSidebarView, setActiveSidebarView] = useState<SidebarView>("chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [contextPanelCollapsed, setContextPanelCollapsed] = useState(true);
  const [agentBarExpanded, setAgentBarExpanded] = useState(false);
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((p) => !p), []);
  const toggleContextPanel = useCallback(() => setContextPanelCollapsed((p) => !p), []);
  const toggleAgentBar = useCallback(() => setAgentBarExpanded((p) => !p), []);

  const openTab = useCallback((tab: Omit<WorkspaceTab, "dirty">) => {
    setTabs((prev) => {
      const existing = prev.find((t) => t.id === tab.id);
      if (existing) return prev;
      return [...prev, { ...tab, dirty: false }];
    });
    setActiveTabId(tab.id);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const filtered = prev.filter((t) => t.id !== id);
      if (id === activeTabId) {
        const newActive = filtered[Math.min(idx, filtered.length - 1)]?.id ?? null;
        setActiveTabId(newActive);
      }
      return filtered;
    });
  }, [activeTabId]);

  const setActiveTab = useCallback((id: string) => setActiveTabId(id), []);

  return (
    <WorkspaceContext.Provider
      value={{
        activeSidebarView,
        setActiveSidebarView,
        sidebarCollapsed,
        toggleSidebar,
        contextPanelCollapsed,
        toggleContextPanel,
        agentBarExpanded,
        toggleAgentBar,
        setAgentBarExpanded,
        tabs,
        activeTabId,
        openTab,
        closeTab,
        setActiveTab,
        commandPaletteOpen,
        setCommandPaletteOpen,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
