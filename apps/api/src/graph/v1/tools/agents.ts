import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { AGENT_CATALOG } from "@vibe-founder/shared";

const AGENT_IDS = AGENT_CATALOG.map((a) => a.id) as [string, ...string[]];

export const listAgentsTool = new DynamicStructuredTool({
  name: "listAgents",
  description:
    "Lists all available automation agents with their status. Agents can automate tasks like competitor research, content drafting, and lead research.",
  schema: z.object({}),
  func: async () => {
    return JSON.stringify({
      agents: AGENT_CATALOG.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        type: a.type,
        aspect: a.aspectSlug,
        available: a.available,
        parameters: a.parameters ?? [],
      })),
    });
  },
});

export const runAgentTool = new DynamicStructuredTool({
  name: "runAgent",
  description:
    "Triggers an automation agent to run. Available agents: competitor-researcher, content-drafter, lead-researcher. Requires a businessId. This is a WRITE operation that requires user approval.",
  schema: z.object({
    agentId: z.enum(AGENT_IDS).describe("The ID of the agent to run"),
    businessId: z.string().describe("The business ID to run the agent against"),
    parameters: z
      .record(z.unknown())
      .optional()
      .describe("Parameters for the agent (e.g. contentType, topic, focusArea)"),
  }),
  func: async ({ agentId, businessId, parameters }) => {
    const agent = AGENT_CATALOG.find((a) => a.id === agentId);
    if (!agent) {
      return JSON.stringify({ error: `Agent "${agentId}" not found` });
    }
    if (!agent.available) {
      return JSON.stringify({
        error: `Agent "${agent.name}" is not yet available. It's currently in development.`,
        agent: { id: agent.id, name: agent.name, type: agent.type },
      });
    }

    return JSON.stringify({
      status: "queued",
      agentId,
      businessId,
      parameters: parameters ?? {},
      message: `Agent "${agent.name}" has been queued. The user can see progress in the Agent Bar at the bottom of the workspace. Results will appear there when complete.`,
      hint: "Tell the user the agent is running and they can monitor progress in the Agent Bar.",
    });
  },
});

export const WRITE_TOOLS = new Set(["runAgent"]);
