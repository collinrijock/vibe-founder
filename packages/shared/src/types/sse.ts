import type { FounderQuestion } from "./chat.js";

export interface SSEAgentStart {
  type: "agent_start";
  threadId: string;
  message: string;
}

export interface SSEToken {
  type: "token";
  content: string;
}

export interface SSEThinking {
  type: "thinking";
  content: string;
}

export interface SSEToolCall {
  type: "tool_call";
  tool: string;
  toolCallId: string;
  args: Record<string, unknown>;
}

export interface SSEToolStart {
  type: "tool_start";
  tool: string;
  runId: string;
}

export interface SSEToolEnd {
  type: "tool_end";
  tool: string;
  runId: string;
}

export interface SSEQuestions {
  type: "questions";
  questions: FounderQuestion[];
}

export interface SSEBusinessPreview {
  type: "business_preview";
  business: BusinessPreviewData;
}

export interface BusinessPreviewData {
  name: string;
  description: string;
  industry: string;
  targetCustomer: string;
  valueProposition: string;
  revenueModel: string;
}

export interface SSEDone {
  type: "done";
  threadId: string;
}

export interface SSEError {
  type: "error";
  message: string;
}

export interface SSEAgentRunStart {
  type: "agent_run_start";
  runId: string;
  agentId: string;
  agentName: string;
}

export interface SSEAgentRunProgress {
  type: "agent_run_progress";
  runId: string;
  message: string;
  progress?: number;
}

export interface SSEAgentRunResult {
  type: "agent_run_result";
  runId: string;
  status: "completed" | "failed" | "needs_approval";
  result?: unknown;
  error?: string;
}

export interface SSEApprovalRequired {
  type: "approval_required";
  approvalId: string;
  runId: string;
  action: string;
  description: string;
  riskLevel: "write_low" | "write_high" | "financial";
  preview: Record<string, unknown>;
}

export type CopilotSSEEvent =
  | SSEAgentStart
  | SSEToken
  | SSEThinking
  | SSEToolCall
  | SSEToolStart
  | SSEToolEnd
  | SSEQuestions
  | SSEBusinessPreview
  | SSEDone
  | SSEError
  | SSEAgentRunStart
  | SSEAgentRunProgress
  | SSEAgentRunResult
  | SSEApprovalRequired;
