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

export const allTools: DynamicStructuredTool[] = [
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

export { WRITE_TOOLS };

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
