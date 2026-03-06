import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { searchNotes } from "../../../services/vectorstore.js";
import {
  loadFoundersNotes,
  loadAspectBySlug,
} from "../../../services/markdown.js";
import {
  ASPECT_DEFINITIONS,
  type AspectSlug,
} from "@vibe-founder/shared";

const ASPECT_SLUGS = ASPECT_DEFINITIONS.map((a) => a.slug) as [
  AspectSlug,
  ...AspectSlug[],
];

export const searchNotesTool = new DynamicStructuredTool({
  name: "searchNotes",
  description:
    "Vector similarity search over the internal knowledge base. Returns the most relevant passages for a query. Best for focused questions about specific topics.",
  schema: z.object({
    query: z.string().describe("The search query"),
    k: z
      .number()
      .optional()
      .default(5)
      .describe("Number of results to return (default 5)"),
    aspectFilter: z
      .enum(ASPECT_SLUGS)
      .optional()
      .describe("Filter results to a specific business aspect"),
  }),
  func: async ({ query, k, aspectFilter }) => {
    const docs = await searchNotes(query, k, aspectFilter);
    if (docs.length === 0) {
      return JSON.stringify({
        results: [],
        note: "No relevant passages found for this topic in the knowledge base.",
      });
    }
    return JSON.stringify({
      results: docs.map((d) => ({
        content: d.pageContent,
        aspect: d.metadata.slug,
        title: d.metadata.title,
      })),
    });
  },
});

export const loadAspectTool = new DynamicStructuredTool({
  name: "loadAspect",
  description:
    "Loads the full markdown content of a specific business domain from the internal knowledge base. Use when you need comprehensive context on one domain.",
  schema: z.object({
    aspect: z
      .enum(ASPECT_SLUGS)
      .describe("The business aspect to load"),
  }),
  func: async ({ aspect }) => {
    const note = loadAspectBySlug(aspect);
    if (!note) {
      return JSON.stringify({ error: `Aspect "${aspect}" not found` });
    }
    return JSON.stringify({
      slug: note.slug,
      title: note.title,
      content: note.rawMarkdown,
    });
  },
});

export const loadAllNotesTool = new DynamicStructuredTool({
  name: "loadAllNotes",
  description:
    "Loads ALL 7 business domain documents. Use sparingly — only for cross-domain analysis, full business reviews, or when the question spans multiple domains.",
  schema: z.object({}),
  func: async () => {
    const notes = loadFoundersNotes();
    return JSON.stringify({
      notes: notes.map((n) => ({
        slug: n.slug,
        title: n.title,
        content: n.rawMarkdown,
      })),
    });
  },
});

export const listAspectsTool = new DynamicStructuredTool({
  name: "listAspects",
  description:
    "Lists all 7 business domains with their slugs and titles. Useful for understanding the structure of the knowledge base.",
  schema: z.object({}),
  func: async () => {
    return JSON.stringify({
      aspects: ASPECT_DEFINITIONS.map((a) => ({
        slug: a.slug,
        title: a.title,
      })),
    });
  },
});
