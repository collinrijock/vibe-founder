import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  loadFoundersNotes,
  loadAspectBySlug,
} from "../../../services/markdown.js";
import { ASPECT_DEFINITIONS, type AspectSlug } from "@vibe-founder/shared";

const ASPECT_SLUGS = ASPECT_DEFINITIONS.map((a) => a.slug) as [
  AspectSlug,
  ...AspectSlug[],
];

export const identifyGapsTool = new DynamicStructuredTool({
  name: "identifyGaps",
  description:
    "Analyzes the business knowledge base and returns a structured gap analysis — what's missing, underdeveloped, or needs more thinking. Can focus on one domain or all.",
  schema: z.object({
    aspect: z
      .enum(ASPECT_SLUGS)
      .optional()
      .describe("Focus on a specific aspect, or omit for all aspects"),
  }),
  func: async ({ aspect }) => {
    let content: string;

    if (aspect) {
      const note = loadAspectBySlug(aspect);
      if (!note)
        return JSON.stringify({ error: `Aspect "${aspect}" not found` });
      content = `## ${note.title}\n\n${note.rawMarkdown}`;
    } else {
      const notes = loadFoundersNotes();
      content = notes
        .map((n) => `## ${n.title}\n\n${n.rawMarkdown}`)
        .join("\n\n---\n\n");
    }

    return JSON.stringify({
      type: "gap_analysis_context",
      scope: aspect || "all",
      content,
      instruction:
        "Analyze this content and identify: (1) missing topics that haven't been addressed, (2) areas that are too vague or need concrete numbers, (3) assumptions that haven't been validated, (4) dependencies between domains that aren't connected.",
    });
  },
});

export const prioritizeActionsTool = new DynamicStructuredTool({
  name: "prioritizeActions",
  description:
    "Extracts action items from the business knowledge base and returns them for prioritization by urgency and impact. Can focus on one domain or all.",
  schema: z.object({
    aspect: z
      .enum(ASPECT_SLUGS)
      .optional()
      .describe("Focus on a specific aspect, or omit for all aspects"),
  }),
  func: async ({ aspect }) => {
    let content: string;

    if (aspect) {
      const note = loadAspectBySlug(aspect);
      if (!note)
        return JSON.stringify({ error: `Aspect "${aspect}" not found` });
      content = `## ${note.title}\n\n${note.rawMarkdown}`;
    } else {
      const notes = loadFoundersNotes();
      content = notes
        .map((n) => `## ${n.title}\n\n${n.rawMarkdown}`)
        .join("\n\n---\n\n");
    }

    return JSON.stringify({
      type: "action_prioritization_context",
      scope: aspect || "all",
      content,
      instruction:
        "Extract every action item, task, and to-do from this content. For each, assess: (1) urgency (time-sensitive or not), (2) impact (high/medium/low), (3) effort (quick win, medium, large), (4) dependencies (what needs to happen first). Return as a prioritized list.",
    });
  },
});
