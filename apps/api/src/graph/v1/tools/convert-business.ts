import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const convertToBusinessTool = new DynamicStructuredTool({
  name: "convertToBusiness",
  description:
    "Present the user with a structured business summary card and an option to convert their idea " +
    "into a tracked business. Use this AFTER the first round of onboarding questions have been answered " +
    "and you have given a high-level summary of the business. Pass the key business details you've gathered " +
    "so the user can review them before accepting.",
  schema: z.object({
    name: z.string().describe("Short business/company name or descriptive title"),
    description: z
      .string()
      .describe("1-2 sentence summary of what the business does"),
    industry: z.string().describe("Industry or market sector"),
    targetCustomer: z.string().describe("Primary customer segment"),
    valueProposition: z.string().describe("Core value the business delivers"),
    revenueModel: z.string().describe("How the business makes money"),
  }),
  func: async (input) => {
    return JSON.stringify({
      status: "business_preview_presented",
      note: "A business preview card has been displayed to the user with an option to accept and create the business. Wait for them to accept or continue the conversation.",
      ...input,
    });
  },
});
