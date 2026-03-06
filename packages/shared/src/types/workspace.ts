import type { BusinessEntity, BusinessPlanEntity } from "./business.js";
import type { InitiativeEntity, MetricEntity, DecisionLogEntry } from "./api.js";
import type { AgentDefinition, AgentRun } from "./agent.js";

export type WorkspaceTabType =
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

export interface WorkspaceTab {
  id: string;
  type: WorkspaceTabType;
  label: string;
  icon: string;
  data: Record<string, unknown>;
  closeable: boolean;
  dirty: boolean;
}

export interface WorkspaceLayout {
  activeSidebarView: SidebarView;
  sidebarCollapsed: boolean;
  contextPanelCollapsed: boolean;
  agentBarExpanded: boolean;
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  splitDirection: "horizontal" | "vertical" | null;
  splitTabIds: [string, string] | null;
}

export type SidebarView =
  | "chat"
  | "business"
  | "initiatives"
  | "agents"
  | "connections"
  | "metrics"
  | "settings";

export interface CommandDefinition {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category: string;
  keywords: string[];
  shortcut?: string;
}

export type ContextPanelContent =
  | { type: "chat_context"; businessSummary: BusinessEntity | null; recentAgentRuns: AgentRun[]; suggestedActions: string[] }
  | { type: "plan_context"; aspect: BusinessPlanEntity; relatedInitiatives: InitiativeEntity[]; relatedMetrics: MetricEntity[] }
  | { type: "initiative_context"; initiative: InitiativeEntity; assignedAgents: AgentDefinition[]; decisions: DecisionLogEntry[] }
  | { type: "agent_context"; agent: AgentDefinition; recentRuns: AgentRun[]; relatedBusiness: BusinessEntity | null }
  | { type: "empty" };
