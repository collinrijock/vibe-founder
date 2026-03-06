import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createLogger } from "../../../lib/logger.js";
import {
  isComposioConfigured,
  executeComposioAction,
  classifyToolRisk,
  getActiveConnections,
  SUPPORTED_PROVIDERS,
} from "../../../services/composio.js";
import type { ToolRiskClassification } from "@vibe-founder/shared";

const log = createLogger("composio-tools");

let _currentUserId: string | null = null;
let _currentBusinessId: string | null = null;

export function setComposioToolContext(userId: string, businessId?: string) {
  _currentUserId = userId;
  _currentBusinessId = businessId ?? null;
}

export function clearComposioToolContext() {
  _currentUserId = null;
  _currentBusinessId = null;
}

export const listConnectionsTool = new DynamicStructuredTool({
  name: "listConnections",
  description:
    "List the user's connected external services (Gmail, Stripe, Slack, etc.). " +
    "Use this to check what integrations are available before attempting to use them.",
  schema: z.object({}),
  func: async () => {
    const userId = _currentUserId;
    if (!userId) {
      return JSON.stringify({ error: "No user context available" });
    }

    if (!isComposioConfigured()) {
      return JSON.stringify({
        configured: false,
        connections: [],
        message: "External connections are not yet configured. The user can set up integrations from the Connections panel in the sidebar.",
        available_providers: SUPPORTED_PROVIDERS.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
        })),
      });
    }

    const activeApps = await getActiveConnections(userId);
    const connected = activeApps.map((appName) => {
      const provider = SUPPORTED_PROVIDERS.find((p) => p.appName === appName);
      return {
        app: appName,
        name: provider?.name ?? appName,
        category: provider?.category ?? "unknown",
      };
    });

    return JSON.stringify({
      configured: true,
      connections: connected,
      available_providers: SUPPORTED_PROVIDERS.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
      })),
    });
  },
});

export const executeExternalActionTool = new DynamicStructuredTool({
  name: "executeExternalAction",
  description:
    "Execute an action on a connected external service (e.g. send an email via Gmail, " +
    "create a Stripe invoice, post to Slack). The action will be risk-classified and " +
    "high-risk actions will require user approval before execution. " +
    "Check connected services with listConnections first.",
  schema: z.object({
    action: z.string().describe("The action to execute (e.g. 'GMAIL_SEND_EMAIL', 'STRIPE_CREATE_INVOICE')"),
    provider: z.string().describe("The provider/app name (e.g. 'gmail', 'stripe', 'slack')"),
    params: z.record(z.unknown()).describe("Parameters for the action"),
    description: z.string().describe("Human-readable description of what this action does"),
  }),
  func: async (input) => {
    const userId = _currentUserId;

    if (!userId) {
      return JSON.stringify({ error: "No user context available" });
    }

    if (!isComposioConfigured()) {
      return JSON.stringify({
        error: "External connections not configured",
        suggestion: "Tell the user to connect the service from the Connections panel in the sidebar",
      });
    }

    const risk = classifyToolRisk(input.action, input.provider);

    if (risk.requiresApproval) {
      return JSON.stringify({
        status: "requires_approval",
        riskLevel: risk.riskLevel,
        action: input.action,
        provider: input.provider,
        description: input.description,
        message: `This ${risk.riskLevel} action requires user approval. The action has been queued for review in the Agent Bar.`,
        preview: input.params,
      });
    }

    const result = await executeComposioAction(userId, input.action, input.params);

    if (result.success) {
      return JSON.stringify({
        status: "executed",
        riskLevel: risk.riskLevel,
        action: input.action,
        data: result.data,
      });
    }

    return JSON.stringify({
      status: "failed",
      action: input.action,
      error: result.error,
    });
  },
});

export const checkToolRiskTool = new DynamicStructuredTool({
  name: "checkToolRisk",
  description:
    "Check the risk classification of an external action before executing it. " +
    "Returns whether the action requires user approval.",
  schema: z.object({
    action: z.string().describe("The action to check (e.g. 'GMAIL_SEND_EMAIL')"),
    provider: z.string().describe("The provider name (e.g. 'gmail')"),
  }),
  func: async (input) => {
    const risk: ToolRiskClassification = classifyToolRisk(input.action, input.provider);
    return JSON.stringify(risk);
  },
});

export const COMPOSIO_TOOLS = [
  listConnectionsTool,
  executeExternalActionTool,
  checkToolRiskTool,
];

export const COMPOSIO_WRITE_TOOLS = new Set([
  "executeExternalAction",
]);
