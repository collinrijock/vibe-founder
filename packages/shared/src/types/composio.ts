export interface ComposioSession {
  userId: string;
  composioEntityId: string;
  activeConnections: string[];
}

export interface ComposioToolExecution {
  userId: string;
  businessId: string;
  tool: string;
  provider: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: "success" | "failed" | "pending_approval";
  riskLevel: ToolRiskLevel;
  timestamp: string;
}

export type ToolRiskLevel = "read" | "write_low" | "write_high" | "financial";

export interface ToolRiskClassification {
  tool: string;
  provider: string;
  riskLevel: ToolRiskLevel;
  requiresApproval: boolean;
  reason: string;
}

export interface PendingApprovalEntity {
  id: string;
  userId: string;
  businessId: string;
  agentRunId: string;
  tool: string;
  provider: string;
  action: string;
  description: string;
  riskLevel: ToolRiskLevel;
  preview: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: string;
  resolvedAt: string | null;
}

export interface SupportedProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "communication" | "productivity" | "financial" | "crm" | "social";
  appName: string;
}

export interface ConnectionEntityWithProvider extends ConnectionEntityBase {
  providerInfo?: SupportedProvider;
}

export interface ConnectionEntityBase {
  id: string;
  userId: string;
  provider: string;
  accountLabel: string;
  status: "active" | "expired" | "revoked";
  composioConnectionId: string;
  lastUsedAt: string | null;
  connectedAt: string;
}
