import type { PendingApprovalEntity } from "./composio.js";

export type AgentRunStatusType = "queued" | "running" | "completed" | "failed" | "waiting_approval" | "cancelled";

export interface AgentRunEntity {
  id: string;
  userId: string;
  businessId: string;
  agentId: string;
  initiativeId: string | null;
  status: AgentRunStatusType;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  logs: AgentRunLogEntry[];
  pendingApprovals: PendingApprovalEntity[];
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface AgentRunLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  tool?: string;
  data?: Record<string, unknown>;
}

export interface StartAgentRunRequest {
  agentId: string;
  businessId: string;
  initiativeId?: string;
  parameters?: Record<string, unknown>;
}

export interface ResolveApprovalRequest {
  approvalId: string;
  decision: "approved" | "rejected";
  editedPayload?: Record<string, unknown>;
}

export type AgentBarSSEEvent =
  | { type: "run_started"; run: AgentRunEntity }
  | { type: "run_progress"; runId: string; message: string; progress?: number }
  | { type: "run_log"; runId: string; entry: AgentRunLogEntry }
  | { type: "approval_needed"; runId: string; approval: PendingApprovalEntity }
  | { type: "run_completed"; runId: string; output: Record<string, unknown> }
  | { type: "run_failed"; runId: string; error: string }
  | { type: "run_cancelled"; runId: string };
