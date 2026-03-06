import type { DynamicStructuredTool } from "@langchain/core/tools";
import {
  searchNotesTool,
  loadAspectTool,
  loadAllNotesTool,
  listAspectsTool,
} from "./notes.js";
import { identifyGapsTool, prioritizeActionsTool } from "./analysis.js";
import { listAgentsTool, runAgentTool, WRITE_TOOLS } from "./agents.js";
import { askFounderQuestionsTool } from "./questions.js";
import { convertToBusinessTool } from "./convert-business.js";
import { COMPOSIO_TOOLS, COMPOSIO_WRITE_TOOLS } from "./composio-tools.js";

export const internalTools: DynamicStructuredTool[] = [
  searchNotesTool,
  loadAspectTool,
  loadAllNotesTool,
  listAspectsTool,
  identifyGapsTool,
  prioritizeActionsTool,
  listAgentsTool,
  runAgentTool,
  askFounderQuestionsTool,
  convertToBusinessTool,
];

export const allTools: DynamicStructuredTool[] = [
  ...internalTools,
  ...COMPOSIO_TOOLS,
];

const ALL_WRITE_TOOLS = new Set([
  ...WRITE_TOOLS,
  ...COMPOSIO_WRITE_TOOLS,
]);

export { ALL_WRITE_TOOLS as WRITE_TOOLS };

export function getToolByName(
  name: string
): DynamicStructuredTool | undefined {
  return allTools.find((t) => t.name === name);
}

export function getToolDescription(
  name: string,
  args: Record<string, unknown>
): string {
  const tool = getToolByName(name);
  if (!tool) return `${name}(${JSON.stringify(args)})`;
  return `${tool.name}: ${tool.description.slice(0, 100)}...`;
}
