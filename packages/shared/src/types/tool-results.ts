import type { AspectSlug } from "./business.js";
import type { AgentDefinition } from "./agent.js";
import type { MetricEntity } from "./api.js";

export type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface SearchNotesResult {
  results: {
    content: string;
    aspect: string;
    title: string;
    score: number;
  }[];
}

export interface LoadAspectResult {
  slug: AspectSlug;
  title: string;
  content: string;
}

export interface ListAspectsResult {
  aspects: { slug: AspectSlug; title: string }[];
}

export interface IdentifyGapsResult {
  gaps: {
    aspect: AspectSlug;
    gap: string;
    severity: "high" | "medium" | "low";
    suggestion: string;
  }[];
}

export interface PrioritizeActionsResult {
  actions: {
    title: string;
    aspect: AspectSlug;
    impact: "high" | "medium" | "low";
    effort: "high" | "medium" | "low";
    rationale: string;
  }[];
}

export interface ListAgentsResult {
  agents: {
    id: string;
    name: string;
    description: string;
    type: string;
    aspect: string;
    available: boolean;
  }[];
}

export interface RunAgentResult {
  runId: string;
  status: string;
  message: string;
}

export interface AskFounderQuestionsInput {
  questions: {
    id: string;
    prompt: string;
    options: { id: string; label: string }[];
    allowMultiple?: boolean;
  }[];
}

export interface ConvertToBusinessInput {
  name: string;
  description: string;
  industry: string;
  targetCustomer: string;
  valueProposition: string;
  revenueModel: string;
}

export interface UpdateBusinessStateInput {
  businessId: string;
  patch: Record<string, unknown>;
}

export interface QueryMetricsInput {
  businessId: string;
  keys?: string[];
  since?: string;
}

export interface QueryMetricsResult {
  metrics: MetricEntity[];
}

export interface LogDecisionInput {
  businessId: string;
  initiativeId?: string;
  decision: string;
  reasoning: string;
}

export interface ManageInitiativeInput {
  action: "create" | "update" | "addMilestone" | "assignAgent";
  businessId: string;
  initiativeId?: string;
  data: Record<string, unknown>;
}
