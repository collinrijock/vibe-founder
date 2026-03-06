import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const questionOptionSchema = z.object({
  id: z.string().describe("Unique identifier for this option"),
  label: z.string().describe("Display text for this option"),
});

const questionSchema = z.object({
  id: z.string().describe("Unique identifier for this question (e.g. q1, q2)"),
  prompt: z.string().describe("The question text to display to the user"),
  options: z
    .array(questionOptionSchema)
    .min(2)
    .describe(
      'Multiple-choice options. The LAST option MUST always be an "Other" option that lets the user type a custom answer.'
    ),
  allowMultiple: z
    .boolean()
    .optional()
    .default(false)
    .describe("If true, user can select multiple options"),
});

export const askFounderQuestionsTool = new DynamicStructuredTool({
  name: "askFounderQuestions",
  description:
    "Present interactive multiple-choice questions to the user as a widget in the chat. " +
    "Use this when you need structured information from the user — especially during onboarding, " +
    "when they share a new business idea, or when you need to clarify key business details. " +
    "Generate 3-6 tailored questions based on what you already know. " +
    'The last option for each question MUST be an "Other" free-text option.',
  schema: z.object({
    questions: z
      .array(questionSchema)
      .min(1)
      .max(6)
      .describe("The questions to present to the user"),
  }),
  func: async ({ questions }) => {
    return JSON.stringify({
      status: "questions_presented",
      questionCount: questions.length,
      note: "Questions have been displayed to the user as an interactive widget. Wait for their responses before continuing.",
    });
  },
});
