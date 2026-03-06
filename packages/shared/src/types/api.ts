import type { BusinessEntity, BusinessUpdatePatch, AspectSlug, BusinessPlanEntity, TodoEntity } from "./business.js";
import type { AgentDefinition } from "./agent.js";

export type UserStage =
  | "ONBOARDING"
  | "PRODUCT_DEFINITION"
  | "CUSTOMER_DISCOVERY"
  | "BUSINESS_MODEL"
  | "OPERATIONS"
  | "GROWTH"
  | "SCALING";

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  stage: UserStage;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserEntity;
}

export interface CreateSessionResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface RenameSessionRequest {
  title: string;
}

export interface BatchDeleteSessionsRequest {
  sessionIds: string[];
}

export interface CopilotRequest {
  message: string;
  threadId: string;
  model?: string;
}

export interface ThreadStateResponse {
  messages: { role: string; content: string }[];
}

export interface ExtractBusinessRequest {
  sessionId: string;
}

export interface ExtractBusinessResponse {
  business: BusinessEntity;
}

export interface UpdateBusinessRequest {
  update: string;
}

export interface UpdateBusinessResponse {
  patch: BusinessUpdatePatch;
  business: BusinessEntity;
}

export interface ToggleTodoRequest {
  status: "pending" | "done";
}

export interface AgentListResponse {
  agents: AgentDefinition[];
}

export interface AspectListResponse {
  aspects: { slug: AspectSlug; title: string; rawMarkdown: string }[];
}

export interface LogEntry {
  id: string;
  level: string;
  category: string;
  source: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface LogListResponse {
  logs: LogEntry[];
}

export interface CreateInitiativeRequest {
  businessId: string;
  name: string;
  description: string;
  goal: string;
  successCriteria: string[];
  targetDate?: string;
  relatedAspects?: AspectSlug[];
}

export interface InitiativeEntity {
  id: string;
  businessId: string;
  name: string;
  description: string;
  goal: string;
  successCriteria: string[];
  status: InitiativeStatus;
  startDate: string;
  targetDate: string | null;
  milestones: MilestoneEntity[];
  tasks: InitiativeTaskEntity[];
  assignedAgents: AgentAssignmentEntity[];
  relatedAspects: AspectSlug[];
  createdAt: string;
  updatedAt: string;
}

export type InitiativeStatus = "planning" | "active" | "paused" | "completed" | "cancelled";

export interface MilestoneEntity {
  id: string;
  name: string;
  targetDate: string;
  status: "pending" | "reached" | "missed";
}

export interface InitiativeTaskEntity {
  id: string;
  title: string;
  assignee: "human" | "agent";
  agentId?: string;
  status: "pending" | "in_progress" | "done";
}

export interface AgentAssignmentEntity {
  agentId: string;
  config: Record<string, unknown>;
  schedule?: string;
}

export interface ConnectionEntity {
  id: string;
  userId: string;
  provider: string;
  accountLabel: string;
  status: "active" | "expired" | "revoked";
  composioConnectionId: string;
  lastUsedAt: string | null;
  connectedAt: string;
}

export interface ConnectServiceRequest {
  provider: string;
  redirectUrl: string;
}

export interface ConnectServiceResponse {
  authUrl: string;
}

export interface DecisionLogEntry {
  id: string;
  businessId: string;
  initiativeId: string | null;
  decision: string;
  reasoning: string;
  madeBy: "human" | "agent";
  agentId?: string;
  outcome?: string;
  createdAt: string;
}

export interface MetricEntity {
  id: string;
  businessId: string;
  key: string;
  label: string;
  value: number;
  unit: string;
  source: "manual" | "agent" | "integration";
  recordedAt: string;
}
