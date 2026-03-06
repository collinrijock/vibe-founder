import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  ToolMessage,
  SystemMessage,
} from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { createLogger } from "../../lib/logger.js";
import { allTools, WRITE_TOOLS, getToolByName } from "./tools/index.js";
import { createLoadSkillTool, SKILL_INDEX } from "./skills.js";

const log = createLogger("v1-agent");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AVAILABLE_MODELS = [
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-6",
] as const;

type AvailableModel = (typeof AVAILABLE_MODELS)[number];

function isValidModel(model: string): model is AvailableModel {
  return AVAILABLE_MODELS.includes(model as AvailableModel);
}
const TOOL_TIMEOUT_MS = 120_000;
const TOOL_MESSAGE_MAX_CHARS = 6_000;
const MAX_MESSAGES_BEFORE_TRIM = 40;
const READ_CONCURRENCY = 5;

// ---------------------------------------------------------------------------
// Structured XML Logging
// ---------------------------------------------------------------------------

function xmlLog(tag: string, fields: Record<string, string | number>): string {
  const inner = Object.entries(fields)
    .map(([k, v]) => `<${k}>${String(v)}</${k}>`)
    .join("");
  return `<${tag}>${inner}</${tag}>`;
}

// ---------------------------------------------------------------------------
// State Definition
// ---------------------------------------------------------------------------

export interface AgentEvent {
  type: string;
  agent?: string;
  message?: string;
  tool?: string;
  [key: string]: unknown;
}

const V1State = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current: BaseMessage[], update: BaseMessage[]) => {
      if (update.length > 1 && current.length > 0) {
        const currentFirst = current[0];
        const updateFirst = update[0];
        if (
          currentFirst.content === updateFirst.content &&
          typeof currentFirst._getType === "function" &&
          currentFirst._getType() ===
            (typeof updateFirst._getType === "function"
              ? updateFirst._getType()
              : "")
        ) {
          return update;
        }
      }
      return [...current, ...update];
    },
    default: () => [],
  }),

  agent_events: Annotation<AgentEvent[]>({
    reducer: (_current: AgentEvent[], update: AgentEvent[]) => update,
    default: () => [],
  }),
});

export type V1StateType = typeof V1State.State;

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(userStage?: string): string {
  const now = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "full",
    timeStyle: "short",
  });

  return `You are an expert business strategist and advisor — a dynamic problem solver deeply versed in the history of entrepreneurship, from Ford and Carnegie to Bezos and modern founders.

You think in first principles, draw on real-world patterns from successful (and failed) businesses, and treat every business challenge as a solvable system. You don't give generic advice — you dig into specifics, pressure-test assumptions, and help the user build something that actually works.

You have an internal knowledge base covering 7 core business domains that you use to ground your thinking. Never mention this knowledge base to the user — it's part of your expertise. When you retrieve information from it, present it naturally as your own analysis and recommendations, the way a seasoned advisor would.

## Critical Rules
1. ACT IMMEDIATELY — use tools to retrieve context, don't ask the user to go look things up. Never ask the user a question you could answer by searching their existing context first. Exhaust your knowledge retrieval before requesting input.
2. MINIMUM TOOLS — use the fewest tool calls needed to answer well
3. LOAD SKILLS FIRST — before responding on any business domain, load the relevant skill for guidance
4. BE SPECIFIC — always ground advice in the user's actual business details, never generic platitudes
5. NEVER REVEAL INTERNAL TOOLS — the user should experience your expertise as natural knowledge. Never reference tools, knowledge base files, aspects, skills, or internal systems by name.
  - NEVER say: "your notes mention," "I found in your knowledge base," "the gap analysis shows," "let me load the skill for," "according to your Founder's Notes," "from your notes," "I searched your notes," "the tool returned," "based on the data I retrieved"
  - INSTEAD say: "Based on what I know about your business," "Looking at your operations," "From what you've told me," "Your situation reminds me of," "Here's what stands out"
6. PERSONAL CONTEXT — the user is at stage: ${userStage || "unknown"}. Tailor advice to their current journey phase.
7. MULTI-TURN AWARENESS — look at conversation history before re-fetching the same data
8. GATHER FULL CONTEXT — before advising on any topic, make sure you have the full picture. Search for related context across relevant domains. Don't stop at the first relevant result — check adjacent domains when the question spans multiple areas. If a tool result seems incomplete or cut off, re-run with more specific parameters to get the detail you need.
9. ENTREPRENEURIAL VOICE:
  - Lead with the insight, not the preamble. No filler phrases.
  - NEVER open with: "Great question!", "That's a really interesting idea!", "I'd be happy to help!", "There are many ways to approach this..."
  - Use numbers and specifics over adjectives ("aim for 3:1 LTV:CAC" not "aim for good unit economics")
  - Be direct, concrete, and action-oriented. Use historical examples and pattern-matching when relevant.
  - When giving action items, use numbered lists with clear owners and timeframes.
  - When comparing options, use a structured format (tables, pros/cons) so the founder can decide quickly.

## Current Context
- Date/time: ${now}
- User stage: ${userStage || "unknown"}

## Tool Domain Index (INTERNAL — never expose these names or mechanics to the user)
- **Knowledge tools:** searchNotes (vector search — prefer for focused questions), loadAspect (full domain content), loadAllNotes (all 7 — use sparingly), listAspects (domain structure overview)
- **Analysis tools:** identifyGaps (gap analysis), prioritizeActions (action ranking)
- **Agent tools:** listAgents (catalog), runAgent (trigger — most agents not yet available)
- **Skill loading:** loadSkill (load domain expertise before responding)
- **Interactive questions:** askFounderQuestions (present multiple-choice questions as an interactive widget)
- **Business creation:** convertToBusiness (present a business summary card with an accept button)
- **External connections:** listConnections (check which services the user has connected), executeExternalAction (execute actions on connected services — respects risk classification), checkToolRisk (check risk level of an action before executing)

## Tool Guardrails (when to use and when NOT to)
- **searchNotes:** Prefer for focused, specific questions. Do NOT use loadAllNotes when searchNotes would suffice.
- **loadAllNotes:** ONLY for cross-domain analysis or when 3+ domains are clearly needed. Do NOT use for single-topic questions.
- **loadAspect:** Use when you need the full picture of one domain. Do NOT use when a targeted searchNotes query would answer the question.
- **identifyGaps:** Great for "what am I missing?" questions. Do NOT use when the user is asking for advice on something specific they already know about.
- **prioritizeActions:** Great for "what should I do first?" questions. Do NOT use when the user has already decided what to do and needs execution guidance.
- **runAgent:** Most agents are NOT yet available — check with listAgents first. Do NOT attempt to run agents without checking availability.
- **askFounderQuestions:** Use for structured multi-choice input (details below). Do NOT use for simple yes/no questions — just ask those in chat. Do NOT use when you could answer the question yourself by searching existing context.
- **convertToBusiness:** Use ONLY after the user has answered their first round of onboarding questions and you have provided a high-level business summary. Do NOT use before gathering enough context. Do NOT use if the user is asking general questions unrelated to creating a new business.
- **loadSkill:** Load before responding on any domain. Do NOT skip this step — your domain expertise depends on it.
- **listConnections:** Use to check what services the user has connected before attempting external actions. Always check first.
- **executeExternalAction:** Use to perform real actions on connected services (send emails, create invoices, post to social). ALWAYS check the risk with checkToolRisk first. High-risk and financial actions will require user approval — inform them it's been queued.
- **checkToolRisk:** Use before executeExternalAction to understand the risk classification. Read operations execute immediately, write-low execute with logging, write-high and financial require user approval.

## askFounderQuestions — Usage Guide
Use this tool when you need STRUCTURED information from the user. Key scenarios:
1. **First business idea** — When the user shares their idea for the first time (especially during ONBOARDING or PRODUCT_DEFINITION stage), ALWAYS use this tool to ask 3-5 questions to understand their stage, target customer, revenue model, competitive advantage, and immediate priorities.
2. **Clarifying ambiguity** — When the user's request is broad and you need specifics to give good advice.
3. **Decision points** — When there are clear options to choose between (e.g. pricing models, distribution channels).

Rules for generating questions:
- Generate 3-6 questions tailored to what they just told you
- Each question must have 3-5 options relevant to their specific business context
- The LAST option MUST always be an "Other" free-text option (id: "other", label: "Other (I'll describe)")
- Options should be specific and informed by what you know about their business, NOT generic
- Use allowMultiple: true when multiple answers make sense (e.g. "Which channels do you use?")
- Do NOT use this tool for simple yes/no questions — just ask those in chat
- After receiving the user's answers, synthesize them with everything you know to deliver a comprehensive, actionable response

## convertToBusiness — Usage Guide
Use this tool to present the user with a business summary card and an "Accept" button. This is the bridge between the discovery conversation and the business dashboard.

### When to use:
1. **After first onboarding Q&A** — The user shared an idea, you asked questions via askFounderQuestions, they answered. Now give a summary and invoke this tool.
2. **After enough context exists** — If the conversation has organically covered enough ground (business concept, customer, revenue model) without formal Q&A, you can still invoke this tool.

### When NOT to use:
- Before you have enough context (at minimum: what the business does, who it serves, how it makes money)
- When the user is asking general business questions unrelated to starting/defining a new business
- When a business has already been created in this conversation
- Multiple times in the same conversation

### The flow:
1. The user shares a business idea → you ask onboarding questions via askFounderQuestions
2. The user answers those questions → you respond with a HIGH-LEVEL SUMMARY of their business (2-4 paragraphs covering what the business is, who it serves, how it makes money, and what makes it compelling)
3. At the END of that summary response, invoke convertToBusiness with the extracted business details
4. The user sees a preview card with an "Accept & Create Business" button

### Field mapping guide:
- **name:** Short, punchy business name. If the user gave one, use it. Otherwise create a descriptive name (e.g. "MealPrep Miami", "LegalAI Consulting")
- **description:** 1-2 sentences that a stranger could read and understand the business (e.g. "AI agent consulting firm that builds custom LangGraph solutions for law firms and real estate companies in Miami")
- **industry:** The market sector (e.g. "AI Consulting", "Food Delivery", "Legal Tech")
- **targetCustomer:** Specific customer segment (e.g. "Mid-size law firms and RE property management companies in Miami with 10-100 employees")
- **valueProposition:** The core value — what pain does it solve? (e.g. "Eliminates manual cross-referencing of siloed CRM, ERP, and legacy database data through intelligent AI agents")
- **revenueModel:** How the business makes money (e.g. "Upfront build fee ($8K-$15K) plus monthly maintenance/hosting ($1.5K-$3K/mo)")

### Response structure after Q&A:
Your text response should follow this structure:
1. **Opening read** (1-2 sentences) — Show you understood their answers and the opportunity
2. **Business snapshot** (2-3 paragraphs) — What the business is, the market opportunity, the customer pain point, and the revenue model. Keep it strategic and concise.
3. **Why it's compelling** (1-2 sentences) — What gives this business a real shot
4. **CTA to accept** (1 sentence) — "I've put together a snapshot of your business below. If this looks right, accept it and I'll set up your dashboard where we can go deeper on strategy, operations, and your first 90 days."
5. Then invoke convertToBusiness with the structured fields

CRITICAL RULES:
- ALWAYS invoke convertToBusiness at the end of your response after the first Q&A round — do NOT skip this step
- Your summary should be concise and strategic — save the deep-dive analysis (pricing frameworks, 30-day plans, competitive positioning) for AFTER they've accepted
- Do NOT give lengthy tactical advice before the business is created — keep it high-level and inviting
- Do NOT list out action items, week-by-week plans, or detailed breakdowns yet — that comes after acceptance

## Interaction Examples (INTERNAL — these show ideal behavior patterns)

<example name="founder-asks-about-pricing">
User: "I'm thinking about charging $29/month for my SaaS"
Good pattern:
1. Load business_model skill
2. Search notes for their existing pricing/revenue context
3. Respond with specific analysis grounded in THEIR unit economics, not generic SaaS advice
4. Reference relevant frameworks (money map, CAC payback) naturally

Bad pattern:
- Give generic "most SaaS companies charge..." advice without loading any context
- Ask "what's your target customer?" when that info is already in their notes
- Say "According to your notes, you mentioned..."
</example>

<example name="founder-asks-broad-question">
User: "Is my business viable?"
Good pattern:
1. Load business_model skill
2. Search notes across multiple relevant domains (product, customers, business model)
3. Use identifyGaps to find what's missing
4. Deliver a structured assessment: what's strong, what's risky, what's unknown
5. End with 2-3 concrete next steps

Bad pattern:
- Answer immediately with generic viability frameworks
- Ask the user to describe their business when you already have their context
- Load only one domain when the question clearly spans several
</example>

<example name="founder-shares-new-idea">
User: "I want to start a meal prep delivery service for busy professionals"
Good pattern:
1. Use askFounderQuestions to gather structured info (stage, target customer, revenue model, competitive edge, priorities)
2. Questions should be specific to meal prep / food delivery, not generic startup questions
3. After receiving answers, write a concise high-level business summary (what it is, who it serves, revenue model, what's compelling)
4. At the END of that summary, invoke convertToBusiness with the extracted details (name, description, industry, targetCustomer, valueProposition, revenueModel)
5. The user sees a preview card and can accept to create their business

Bad pattern:
- Immediately give advice without understanding their specifics
- Ask generic questions like "What industry are you in?" when they just told you
- Use askFounderQuestions with vague, one-size-fits-all options
- Skip the convertToBusiness step after the first Q&A round
- Write a 2000-word deep-dive before the business is even created
</example>

<example name="full-flow-idea-to-business-creation">
User: "I want to build an AI consulting firm for legacy businesses in Miami"
Step 1 — Agent uses askFounderQuestions with questions specific to AI consulting / Miami market
Step 2 — User answers: targeting law firms + RE companies, CRM/ERP integration, upfront + monthly pricing, idea phase, wants first client

Step 3 — Agent responds (GOOD):
"This is a well-positioned niche — AI agent consulting for Miami's legacy business market hits the intersection of massive demand and real technical depth. Law firms and RE companies sitting on siloed Salesforce, Clio, and property management data are exactly the clients who need this but can't build it themselves.

Your upfront build + monthly maintenance model gives you cash to fund delivery and recurring revenue for compounding value. Miami's relationship-driven business culture is an advantage here — once you land one managing partner or property owner, referrals travel fast.

The combination of LangGraph expertise and local market focus is a genuine moat. Most AI consultancies try to serve everyone — you're going narrow and deep, which is how firms like Palantir started before scaling.

I've put together a snapshot of your business below. If this looks right, accept it and I'll set up your dashboard where we can map out your go-to-market, pricing architecture, and first 90 days."

Then invokes: convertToBusiness({
  name: "Miami AI Consulting",
  description: "AI agent consulting firm building custom LangGraph solutions for law firms and real estate companies in Miami, integrating cross-domain internal data across CRM, ERP, and legacy systems",
  industry: "AI Consulting / Enterprise Software",
  targetCustomer: "Mid-size law firms and RE property management companies in Miami (10-100 employees)",
  valueProposition: "Eliminates manual cross-referencing of siloed business data through intelligent AI agents that surface insights in seconds",
  revenueModel: "Upfront build fee + monthly maintenance/hosting"
})

Step 3 — Agent responds (BAD):
- Writes 2000 words with a week-by-week plan, pricing tables, competitive analysis, and action items BEFORE invoking convertToBusiness
- Forgets to invoke convertToBusiness entirely and just gives advice
- Invokes convertToBusiness but with vague fields like industry: "Technology", targetCustomer: "Businesses"
- Asks MORE questions instead of summarizing and presenting the business card
</example>

<example name="convert-to-business-field-quality">
GOOD field values:
- name: "FreshPrep Co" (specific, memorable)
- description: "Weekly meal prep delivery service for busy professionals in Austin, offering customizable macro-balanced meals with rotating seasonal menus" (concrete, a stranger gets it)
- industry: "Food Delivery / Meal Prep" (specific)
- targetCustomer: "Time-starved professionals aged 25-45 in Austin who want healthy eating without the cooking time" (detailed segment)
- valueProposition: "Chef-prepared, macro-balanced meals delivered weekly — eliminates 5+ hours of meal planning, shopping, and cooking per week" (quantified)
- revenueModel: "Weekly subscription ($89-$149/week based on meal count) with add-on snack boxes" (specific with price points)

BAD field values:
- name: "My Business" (generic)
- description: "A food business" (too vague)
- industry: "Food" (too broad)
- targetCustomer: "People who want food" (not a segment)
- valueProposition: "Good food delivered" (no specificity)
- revenueModel: "Subscription" (no detail)
</example>

${SKILL_INDEX}
`;
}

// ---------------------------------------------------------------------------
// Message Helpers
// ---------------------------------------------------------------------------

function isAIMessage(msg: BaseMessage): msg is AIMessage {
  return msg._getType() === "ai";
}

function isToolMessage(msg: BaseMessage): msg is ToolMessage {
  return msg._getType() === "tool";
}

function isHumanMessage(msg: BaseMessage): msg is HumanMessage {
  return msg._getType() === "human";
}

function getToolCalls(
  msg: AIMessage
): { id: string; name: string; args: Record<string, unknown> }[] {
  return (msg.tool_calls ?? []).map((tc) => ({
    id: tc.id ?? "",
    name: tc.name,
    args: tc.args as Record<string, unknown>,
  }));
}

function getToolCallId(msg: ToolMessage): string {
  return msg.tool_call_id ?? "";
}

function getMessageTextContent(msg: BaseMessage): string {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((c): c is { type: "text"; text: string } => {
        return typeof c === "object" && c !== null && "type" in c && c.type === "text";
      })
      .map((c) => c.text)
      .join("");
  }
  return "";
}

// ---------------------------------------------------------------------------
// Layer 1: Validate & Fix Message State
// ---------------------------------------------------------------------------

function validateAndFixMessageState(messages: BaseMessage[]): BaseMessage[] {
  const fixed: BaseMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    fixed.push(msg);

    if (isAIMessage(msg)) {
      const toolCalls = getToolCalls(msg);
      if (toolCalls.length > 0) {
        const pendingIds = new Map(toolCalls.map((tc) => [tc.id, tc.name]));

        for (let j = i + 1; j < messages.length; j++) {
          const next = messages[j];
          if (isToolMessage(next)) {
            pendingIds.delete(getToolCallId(next));
          } else {
            break;
          }
        }

        if (pendingIds.size > 0 && i < messages.length - 1) {
          for (const [id, name] of pendingIds) {
            fixed.push(
              new ToolMessage({
                tool_call_id: id,
                content: JSON.stringify({
                  error: `Tool "${name}" response was lost. Re-run if needed.`,
                }),
              })
            );
          }
        }
      }
    }
  }
  return fixed;
}

// ---------------------------------------------------------------------------
// Layer 2: Trim Messages
// ---------------------------------------------------------------------------

function trimMessages(messages: BaseMessage[]): BaseMessage[] {
  if (messages.length <= MAX_MESSAGES_BEFORE_TRIM) return messages;

  const trailingChain: BaseMessage[] = [];
  let i = messages.length - 1;
  for (; i >= 0; i--) {
    const msg = messages[i];
    if (isToolMessage(msg)) {
      trailingChain.unshift(msg);
      continue;
    }
    if (isAIMessage(msg) && getToolCalls(msg).length > 0) {
      trailingChain.unshift(msg);
      continue;
    }
    break;
  }

  const remaining = messages.slice(0, i + 1);
  const kept: BaseMessage[] = [];
  let humanCount = 0;
  let aiCount = 0;

  for (let j = remaining.length - 1; j >= 0; j--) {
    const msg = remaining[j];
    if (isHumanMessage(msg) && humanCount < 8) {
      kept.unshift(msg);
      humanCount++;
    } else if (isAIMessage(msg) && aiCount < 8) {
      kept.unshift(msg);
      aiCount++;
    }
    if (humanCount >= 8 && aiCount >= 8) break;
  }

  return [...kept, ...trailingChain];
}

// ---------------------------------------------------------------------------
// Layer 3: Truncate Tool Messages
// ---------------------------------------------------------------------------

function truncateToolMessages(
  messages: BaseMessage[],
  maxChars: number = TOOL_MESSAGE_MAX_CHARS
): BaseMessage[] {
  return messages.map((m) => {
    if (!isToolMessage(m)) return m;
    const content = getMessageTextContent(m);
    if (content.length <= maxChars) return m;
    return new ToolMessage({
      tool_call_id: getToolCallId(m),
      content: JSON.stringify({
        truncated: true,
        originalLength: content.length,
        preview: content.slice(0, maxChars),
        note: "Output was truncated. Re-run the tool with more specific parameters if you need more detail.",
      }),
    });
  });
}

// ---------------------------------------------------------------------------
// Model Helper
// ---------------------------------------------------------------------------

function getModel(modelId: string) {
  return new ChatAnthropic({
    model: modelId,
    temperature: 1,
    topP: null,
    maxTokens: 16000,
    thinking: {
      type: "enabled",
      budget_tokens: 8000,
    },
  });
}

function getModelWithTools(
  modelId: string,
  tools: ReturnType<typeof getAllAgentTools>
) {
  const model = getModel(modelId);
  return model.bindTools(tools);
}

function getAllAgentTools() {
  return [...allTools, createLoadSkillTool()];
}

// ---------------------------------------------------------------------------
// Agent Node
// ---------------------------------------------------------------------------

function createAgentNode() {
  const agentTools = getAllAgentTools();

  return async (
    state: V1StateType,
    config?: RunnableConfig
  ): Promise<Partial<V1StateType>> => {
    const requestedModel = (config as any)?.configurable?.model;
    const modelId: string =
      requestedModel && isValidModel(requestedModel)
        ? requestedModel
        : "claude-opus-4-6";

    let messages = validateAndFixMessageState(state.messages);
    messages = trimMessages(messages);
    messages = truncateToolMessages(messages);

    const systemMessage = new SystemMessage(buildSystemPrompt());
    messages = [systemMessage, ...messages];

    log.info(
      xmlLog("v1_agent", {
        model: modelId,
        message_count: messages.length,
      })
    );

    let response: AIMessage;
    try {
      const modelWithTools = getModelWithTools(modelId, agentTools);
      response = (await modelWithTools.invoke(messages, config)) as AIMessage;
    } catch (apiError) {
      const errorMsg =
        apiError instanceof Error ? apiError.message : String(apiError);

      if (
        errorMsg.includes("429") ||
        errorMsg.includes("Too Many Requests") ||
        errorMsg.includes("quota") ||
        errorMsg.includes("rate")
      ) {
        log.warn(
          xmlLog("v1_fallback", {
            reason: "rate_limit",
            fallback: "claude-haiku-4-5-20251001",
          })
        );
        const fallbackModel = getModelWithTools("claude-haiku-4-5-20251001", agentTools);
        response = (await fallbackModel.invoke(messages, config)) as AIMessage;
      } else {
        throw apiError;
      }
    }

    const toolCalls = getToolCalls(response);
    log.info(
      xmlLog("v1_agent_response", {
        tool_calls: toolCalls.length,
        has_content: getMessageTextContent(response).length > 0 ? 1 : 0,
      })
    );

    return { messages: [response] };
  };
}

// ---------------------------------------------------------------------------
// Concurrency Helper
// ---------------------------------------------------------------------------

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let nextIndex = 0;

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const idx = nextIndex++;
        if (idx >= items.length) break;
        results[idx] = await worker(items[idx]);
      }
    }
  );

  await Promise.all(runners);
  return results;
}

// ---------------------------------------------------------------------------
// Tool Node
// ---------------------------------------------------------------------------

async function toolNode(
  state: V1StateType,
  _config?: RunnableConfig
): Promise<Partial<V1StateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  if (!isAIMessage(lastMessage)) {
    log.warn("toolNode called without AI message as last message");
    return { messages: [] };
  }

  const toolCalls = getToolCalls(lastMessage);
  if (toolCalls.length === 0) return { messages: [] };

  // Build deduplication cache from prior tool results
  const priorToolResults = new Map<string, string>();
  for (let i = 0; i < state.messages.length - 1; i++) {
    const msg = state.messages[i];
    if (isAIMessage(msg)) {
      for (const tc of getToolCalls(msg)) {
        const key = `${tc.name}::${JSON.stringify(tc.args)}`;
        for (let j = i + 1; j < state.messages.length; j++) {
          const nm = state.messages[j];
          if (isToolMessage(nm) && getToolCallId(nm) === tc.id) {
            priorToolResults.set(key, getMessageTextContent(nm));
            break;
          }
        }
      }
    }
  }

  // Split into read-only vs write tools
  const readOnly = toolCalls.filter((tc) => !WRITE_TOOLS.has(tc.name));
  const needsApproval = toolCalls.filter((tc) => WRITE_TOOLS.has(tc.name));

  const toolMessages: ToolMessage[] = [];

  // Execute read-only tools in parallel with concurrency limit
  if (readOnly.length > 0) {
    const results = await mapWithConcurrency(
      readOnly,
      READ_CONCURRENCY,
      async (tc) => {
        const dedupeKey = `${tc.name}::${JSON.stringify(tc.args)}`;
        const cached = priorToolResults.get(dedupeKey);
        if (cached) {
          log.info(xmlLog("v1_tool_cached", { name: tc.name, id: tc.id }));
          return new ToolMessage({
            tool_call_id: tc.id,
            content: cached,
          });
        }

        log.info(xmlLog("v1_tool_exec", { name: tc.name, id: tc.id }));
        const start = Date.now();

        try {
          const tool = getToolByName(tc.name);
          if (!tool) {
            return new ToolMessage({
              tool_call_id: tc.id,
              content: JSON.stringify({
                error: `Unknown tool: ${tc.name}`,
              }),
            });
          }

          const result = await Promise.race([
            tool.invoke(tc.args),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error(`Tool "${tc.name}" timed out after ${TOOL_TIMEOUT_MS}ms`)),
                TOOL_TIMEOUT_MS
              )
            ),
          ]);

          const duration = Date.now() - start;
          const content =
            typeof result === "string" ? result : JSON.stringify(result);
          log.info(
            xmlLog("v1_tool_done", {
              name: tc.name,
              duration_ms: duration,
              length: content.length,
            })
          );

          return new ToolMessage({
            tool_call_id: tc.id,
            content,
          });
        } catch (err) {
          const duration = Date.now() - start;
          log.error(
            xmlLog("v1_tool_error", {
              name: tc.name,
              duration_ms: duration,
              error:
                err instanceof Error ? err.message : String(err),
            })
          );
          return new ToolMessage({
            tool_call_id: tc.id,
            content: JSON.stringify({
              error:
                err instanceof Error ? err.message : String(err),
            }),
          });
        }
      }
    );

    toolMessages.push(...results);
  }

  // Handle write tools (currently just returns results since HITL interrupt
  // will be added when agents become available)
  if (needsApproval.length > 0) {
    for (const tc of needsApproval) {
      log.info(xmlLog("v1_write_tool", { name: tc.name, id: tc.id }));
      try {
        const tool = getToolByName(tc.name);
        if (!tool) {
          toolMessages.push(
            new ToolMessage({
              tool_call_id: tc.id,
              content: JSON.stringify({ error: `Unknown tool: ${tc.name}` }),
            })
          );
          continue;
        }

        const result = await tool.invoke(tc.args);
        toolMessages.push(
          new ToolMessage({
            tool_call_id: tc.id,
            content:
              typeof result === "string" ? result : JSON.stringify(result),
          })
        );
      } catch (err) {
        toolMessages.push(
          new ToolMessage({
            tool_call_id: tc.id,
            content: JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            }),
          })
        );
      }
    }
  }

  return { messages: toolMessages };
}

// ---------------------------------------------------------------------------
// Routing: should we continue to tools or end?
// ---------------------------------------------------------------------------

function shouldContinueOrEnd(
  state: V1StateType
): "tools" | "__end__" {
  const lastMessage = state.messages[state.messages.length - 1];
  if (isAIMessage(lastMessage) && getToolCalls(lastMessage).length > 0) {
    return "tools";
  }
  return "__end__";
}

// ---------------------------------------------------------------------------
// Graph Construction
// ---------------------------------------------------------------------------

function buildGraphInternal() {
  const workflow = new StateGraph(V1State)
    .addNode("agent", createAgentNode())
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinueOrEnd, {
      tools: "tools",
      __end__: END,
    })
    .addEdge("tools", "agent");

  return workflow;
}

// ---------------------------------------------------------------------------
// Graph Compilation & Caching
// ---------------------------------------------------------------------------

type CompiledGraph = ReturnType<
  ReturnType<typeof buildGraphInternal>["compile"]
>;

let compiledGraph: CompiledGraph | null = null;

export async function getGraph(): Promise<CompiledGraph> {
  if (compiledGraph) return compiledGraph;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is required for the agent checkpointer");
  }

  log.info("Initializing agent graph with PostgreSQL checkpointer");

  const checkpointer = PostgresSaver.fromConnString(dbUrl);
  await checkpointer.setup();

  const workflow = buildGraphInternal();
  compiledGraph = workflow.compile({
    checkpointer,
  });

  log.info("Agent graph compiled and ready");
  return compiledGraph;
}

export { V1State, buildSystemPrompt };
