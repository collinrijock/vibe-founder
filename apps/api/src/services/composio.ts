import { Composio } from "@composio/core";
import { createLogger } from "../lib/logger.js";
import type {
  ToolRiskLevel,
  ToolRiskClassification,
} from "@vibe-founder/shared";

const log = createLogger("composio");

let composioClient: any = null;

function getComposioClient(): any {
  if (!process.env.COMPOSIO_API_KEY) {
    return null;
  }
  if (!composioClient) {
    composioClient = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
    });
    log.info("Composio client initialized");
  }
  return composioClient;
}

export function isComposioConfigured(): boolean {
  return !!process.env.COMPOSIO_API_KEY;
}

export async function initiateConnection(
  userId: string,
  appName: string,
  redirectUrl: string
): Promise<{ authUrl: string; connectionId: string } | null> {
  const client = getComposioClient();
  if (!client) return null;

  try {
    const result = await client.connectedAccounts.initiate(userId, appName, {
      callbackUrl: redirectUrl,
    });
    return {
      authUrl: result?.redirectUrl ?? result?.url ?? "",
      connectionId: result?.connectedAccountId ?? result?.id ?? "",
    };
  } catch (err) {
    log.error(`Failed to initiate connection for ${appName}`, err);
    return null;
  }
}

export async function getActiveConnections(userId: string): Promise<string[]> {
  const client = getComposioClient();
  if (!client) return [];

  try {
    const connections = await client.connectedAccounts.list({
      userIds: [userId],
    });
    const items = connections?.items ?? connections ?? [];
    return Array.isArray(items)
      ? items.map((c: any) => c.toolkitSlug ?? c.appName ?? c.integrationId ?? "")
      : [];
  } catch (err) {
    log.error("Failed to get active connections", err);
    return [];
  }
}

export async function getComposioToolsForUser(userId: string) {
  const client = getComposioClient();
  if (!client) return [];

  try {
    const connections = await client.connectedAccounts.list({
      userIds: [userId],
    });
    const items = connections?.items ?? connections ?? [];
    if (!Array.isArray(items) || items.length === 0) return [];

    const connectedApps = items
      .map((c: any) => c.toolkitSlug ?? c.appName ?? "")
      .filter(Boolean);

    if (connectedApps.length === 0) return [];

    const tools = await client.tools.getRawComposioTools({
      toolkitSlugs: connectedApps.slice(0, 10),
    });
    return tools?.items ?? tools ?? [];
  } catch (err) {
    log.error("Failed to get Composio tools for user", err);
    return [];
  }
}

export async function executeComposioAction(
  userId: string,
  actionName: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const client = getComposioClient();
  if (!client) return { success: false, error: "Composio not configured" };

  try {
    const result = await client.tools.execute(actionName, {
      userId,
      arguments: params,
      dangerouslySkipVersionCheck: true,
    });
    return { success: true, data: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`Composio action ${actionName} failed: ${msg}`);
    return { success: false, error: msg };
  }
}

const RISK_CLASSIFICATIONS: Record<string, ToolRiskLevel> = {
  "GMAIL_FETCH_EMAILS": "read",
  "GMAIL_GET_PROFILE": "read",
  "GOOGLESHEETS_GET_SPREADSHEET": "read",
  "SLACK_LIST_CHANNELS": "read",
  "SLACK_GET_MESSAGES": "read",
  "HUBSPOT_LIST_CONTACTS": "read",
  "STRIPE_LIST_CUSTOMERS": "read",
  "STRIPE_GET_BALANCE": "read",
  "CALENDAR_LIST_EVENTS": "read",
  "NOTION_GET_PAGE": "read",
  "LINKEDIN_GET_PROFILE": "read",

  "GOOGLESHEETS_UPDATE_CELL": "write_low",
  "NOTION_CREATE_PAGE": "write_low",
  "NOTION_UPDATE_PAGE": "write_low",
  "SLACK_POST_MESSAGE": "write_low",
  "CALENDAR_CREATE_EVENT": "write_low",
  "HUBSPOT_CREATE_CONTACT": "write_low",
  "HUBSPOT_UPDATE_CONTACT": "write_low",

  "GMAIL_SEND_EMAIL": "write_high",
  "TWITTER_CREATE_TWEET": "write_high",
  "LINKEDIN_CREATE_POST": "write_high",
  "SLACK_SEND_DM": "write_high",

  "STRIPE_CREATE_INVOICE": "financial",
  "STRIPE_CREATE_CHARGE": "financial",
  "STRIPE_CREATE_SUBSCRIPTION": "financial",
  "STRIPE_REFUND": "financial",
  "STRIPE_UPDATE_PRICE": "financial",
};

export function classifyToolRisk(
  toolName: string,
  provider: string
): ToolRiskClassification {
  const knownLevel = RISK_CLASSIFICATIONS[toolName];

  if (knownLevel) {
    return {
      tool: toolName,
      provider,
      riskLevel: knownLevel,
      requiresApproval: knownLevel === "write_high" || knownLevel === "financial",
      reason: `Known ${knownLevel} operation`,
    };
  }

  const lowerTool = toolName.toLowerCase();

  if (lowerTool.includes("send") || lowerTool.includes("post") || lowerTool.includes("publish")) {
    return {
      tool: toolName,
      provider,
      riskLevel: "write_high",
      requiresApproval: true,
      reason: "Action involves sending/posting content externally",
    };
  }

  if (lowerTool.includes("create") || lowerTool.includes("update") || lowerTool.includes("delete")) {
    return {
      tool: toolName,
      provider,
      riskLevel: "write_low",
      requiresApproval: false,
      reason: "CRUD operation on external service",
    };
  }

  if (
    lowerTool.includes("charge") || lowerTool.includes("invoice") ||
    lowerTool.includes("payment") || lowerTool.includes("refund") ||
    lowerTool.includes("subscription") || lowerTool.includes("price")
  ) {
    return {
      tool: toolName,
      provider,
      riskLevel: "financial",
      requiresApproval: true,
      reason: "Financial operation",
    };
  }

  return {
    tool: toolName,
    provider,
    riskLevel: "read",
    requiresApproval: false,
    reason: "Default classification — assumed read-only",
  };
}

export const SUPPORTED_PROVIDERS = [
  {
    id: "gmail",
    name: "Gmail",
    icon: "fa-solid fa-envelope",
    description: "Send and read emails",
    category: "communication" as const,
    appName: "gmail",
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    icon: "fa-solid fa-table",
    description: "Read and write spreadsheet data",
    category: "productivity" as const,
    appName: "googlesheets",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    icon: "fa-solid fa-calendar",
    description: "Manage calendar events",
    category: "productivity" as const,
    appName: "googlecalendar",
  },
  {
    id: "slack",
    name: "Slack",
    icon: "fa-brands fa-slack",
    description: "Send messages and manage channels",
    category: "communication" as const,
    appName: "slack",
  },
  {
    id: "stripe",
    name: "Stripe",
    icon: "fa-solid fa-credit-card",
    description: "Create invoices and manage payments",
    category: "financial" as const,
    appName: "stripe",
  },
  {
    id: "notion",
    name: "Notion",
    icon: "fa-solid fa-book",
    description: "Create and manage pages and databases",
    category: "productivity" as const,
    appName: "notion",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    icon: "fa-solid fa-users",
    description: "Manage contacts and deals",
    category: "crm" as const,
    appName: "hubspot",
  },
  {
    id: "twitter",
    name: "Twitter / X",
    icon: "fa-brands fa-x-twitter",
    description: "Post tweets and engage with audience",
    category: "social" as const,
    appName: "twitter",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "fa-brands fa-linkedin",
    description: "Post updates and manage professional presence",
    category: "social" as const,
    appName: "linkedin",
  },
  {
    id: "airtable",
    name: "Airtable",
    icon: "fa-solid fa-grid-2",
    description: "Manage bases, tables, and records",
    category: "productivity" as const,
    appName: "airtable",
  },
];

export type SupportedProviderId = typeof SUPPORTED_PROVIDERS[number]["id"];
