import type { BusinessEntity, BusinessPlanEntity, TodoEntity, AspectSlug } from "./business.js";
import type { InitiativeEntity, ConnectionEntity, MetricEntity, DecisionLogEntry } from "./api.js";
import type { BusinessDNA } from "./business-dna.js";

export interface BusinessStateSnapshot {
  business: BusinessEntity;
  plans: BusinessPlanEntity[];
  todos: TodoEntity[];
  initiatives: InitiativeEntity[];
  connections: ConnectionEntity[];
  metrics: MetricEntity[];
  decisionLog: DecisionLogEntry[];
  dna: BusinessDNA | null;
}

export type MentionContext =
  | { type: "plan"; data: BusinessPlanEntity }
  | { type: "competitors"; data: CompetitorEntry[] }
  | { type: "pipeline"; data: PipelineEntry[] }
  | { type: "finances"; data: MetricEntity[] }
  | { type: "initiative"; data: InitiativeEntity }
  | { type: "voice"; data: BusinessDNA["voice"] }
  | { type: "customer"; data: CustomerEntry }
  | { type: "full_plan"; data: BusinessPlanEntity[] };

export interface CompetitorEntry {
  id: string;
  name: string;
  website: string | null;
  positioning: string;
  strengths: string[];
  weaknesses: string[];
  lastUpdated: string;
  source: "agent" | "manual";
}

export interface PipelineEntry {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  stage: "lead" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  value: number | null;
  source: string;
  lastActivity: string;
  notes: string;
}

export interface CustomerEntry {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  status: "active" | "churned" | "prospect";
  history: { date: string; event: string }[];
}
