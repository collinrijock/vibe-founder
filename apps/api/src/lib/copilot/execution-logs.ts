import prisma from "../prisma.js";
import { createLogger } from "../logger.js";
import type { Prisma } from "../../generated/prisma/client.js";

const log = createLogger("exec-logs");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CopilotExecType =
  | "request_start"
  | "agent_start"
  | "agent_handoff"
  | "tool_start"
  | "tool_end"
  | "tool_error"
  | "subagent_spawn"
  | "completion"
  | "error";

export interface CopilotExecLog {
  execType: CopilotExecType;
  threadId: string;
  agent?: string;
  toolName?: string;
  toolCallId?: string;
  durationMs?: number;
  error?: string;
}

export interface BackendLogEntry {
  id: string;
  level: string;
  category: string;
  source: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Persistence — writes directly to Log table, bypassing any buffering
// ---------------------------------------------------------------------------

function buildMetadata(entry: CopilotExecLog): Prisma.InputJsonValue {
  const meta: Record<string, string | number> = {
    execType: entry.execType,
    threadId: entry.threadId,
  };
  if (entry.agent) meta.agent = entry.agent;
  if (entry.toolName) meta.toolName = entry.toolName;
  if (entry.toolCallId) meta.toolCallId = entry.toolCallId;
  if (entry.durationMs !== undefined) meta.durationMs = entry.durationMs;
  if (entry.error) meta.error = entry.error;
  return meta;
}

export async function persistExecLog(
  userId: string,
  entry: CopilotExecLog
): Promise<void> {
  try {
    await prisma.log.create({
      data: {
        userId,
        level: entry.execType === "error" || entry.execType === "tool_error" ? "error" : "info",
        category: "COPILOT",
        source: entry.agent || "copilot",
        message: formatExecMessage(entry),
        metadata: buildMetadata(entry),
      },
    });
  } catch (err) {
    log.warn("Failed to persist exec log", {
      execType: entry.execType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function formatExecMessage(entry: CopilotExecLog): string {
  const prefix = `[thread:${entry.threadId}]`;
  switch (entry.execType) {
    case "request_start":
      return `${prefix} Request started`;
    case "agent_start":
      return `${prefix} Agent ${entry.agent || "main"} started`;
    case "agent_handoff":
      return `${prefix} Handoff to agent ${entry.agent || "unknown"}`;
    case "tool_start":
      return `${prefix} Tool ${entry.toolName} started`;
    case "tool_end":
      return `${prefix} Tool ${entry.toolName} completed in ${entry.durationMs ?? "?"}ms`;
    case "tool_error":
      return `${prefix} Tool ${entry.toolName} failed: ${entry.error || "unknown error"}`;
    case "subagent_spawn":
      return `${prefix} Spawned sub-agent ${entry.agent || "unknown"}`;
    case "completion":
      return `${prefix} Request completed in ${entry.durationMs ?? "?"}ms`;
    case "error":
      return `${prefix} Request error: ${entry.error || "unknown"}`;
    default:
      return `${prefix} Exec event: ${entry.execType}`;
  }
}

// ---------------------------------------------------------------------------
// Scoped logger helper — convenience methods for the copilot runtime
// ---------------------------------------------------------------------------

export function createExecLogger(userId: string, threadId: string) {
  const persist = (entry: Omit<CopilotExecLog, "threadId">) =>
    persistExecLog(userId, { ...entry, threadId });

  return {
    requestStart() {
      return persist({ execType: "request_start" });
    },

    agentStart(agent: string = "main") {
      return persist({ execType: "agent_start", agent });
    },

    agentHandoff(fromAgent: string, toAgent: string) {
      return persist({
        execType: "agent_handoff",
        agent: `${fromAgent}->${toAgent}`,
      });
    },

    toolStart(toolName: string, toolCallId?: string) {
      return persist({ execType: "tool_start", toolName, toolCallId });
    },

    toolEnd(toolName: string, durationMs: number, toolCallId?: string) {
      return persist({ execType: "tool_end", toolName, durationMs, toolCallId });
    },

    toolError(toolName: string, error: string, toolCallId?: string) {
      return persist({ execType: "tool_error", toolName, error, toolCallId });
    },

    subagentSpawn(agent: string) {
      return persist({ execType: "subagent_spawn", agent });
    },

    completion(durationMs: number) {
      return persist({ execType: "completion", durationMs });
    },

    error(error: string) {
      return persist({ execType: "error", error });
    },
  };
}
