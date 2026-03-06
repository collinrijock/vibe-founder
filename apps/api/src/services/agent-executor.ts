import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import {
  AGENT_CATALOG,
  type AgentRunEntity,
  type AgentRunLogEntry,
  type AgentBarSSEEvent,
} from "@vibe-founder/shared";
import prisma from "../lib/prisma.js";
import { createLogger } from "../lib/logger.js";
import { getAgentSystemPrompt } from "./agent-prompts.js";

const log = createLogger("agent-executor");

type SSEEmitter = (event: AgentBarSSEEvent) => void;

interface AgentContext {
  userId: string;
  businessId: string;
  agentId: string;
  initiativeId?: string;
  parameters: Record<string, unknown>;
}

interface BusinessSnapshot {
  name: string;
  description: string;
  industry: string;
  targetCustomer: string;
  valueProposition: string;
  revenueModel: string;
  plans: { aspectSlug: string; title: string; summary: string; rawMarkdown: string }[];
  dna: {
    voiceTone: string;
    principles: unknown[];
    voiceExamples: unknown[];
  } | null;
}

async function loadBusinessContext(businessId: string): Promise<BusinessSnapshot> {
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    include: {
      plans: { select: { aspectSlug: true, title: true, summary: true, rawMarkdown: true } },
      dna: true,
    },
  });

  return {
    name: business.name,
    description: business.description,
    industry: business.industry,
    targetCustomer: business.targetCustomer,
    valueProposition: business.valueProposition,
    revenueModel: business.revenueModel,
    plans: business.plans,
    dna: business.dna
      ? {
          voiceTone: business.dna.voiceTone,
          principles: business.dna.principles as unknown[],
          voiceExamples: business.dna.voiceExamples as unknown[],
        }
      : null,
  };
}

async function appendLog(
  runId: string,
  entry: AgentRunLogEntry,
  emit?: SSEEmitter
): Promise<void> {
  await prisma.agentRunLog.create({
    data: {
      runId,
      level: entry.level,
      message: entry.message,
      tool: entry.tool,
      data: entry.data ? JSON.parse(JSON.stringify(entry.data)) : undefined,
    },
  });

  if (emit) {
    emit({ type: "run_log", runId, entry });
  }
}

function makeLogEntry(
  level: "info" | "warn" | "error",
  message: string,
  extra?: { tool?: string; data?: Record<string, unknown> }
): AgentRunLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra,
  };
}

function toRunEntity(run: {
  id: string;
  userId: string;
  businessId: string;
  agentId: string;
  initiativeId: string | null;
  status: string;
  input: unknown;
  output: unknown;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}): AgentRunEntity {
  return {
    id: run.id,
    userId: run.userId,
    businessId: run.businessId,
    agentId: run.agentId,
    initiativeId: run.initiativeId,
    status: run.status.toLowerCase() as AgentRunEntity["status"],
    input: (run.input ?? {}) as Record<string, unknown>,
    output: (run.output ?? null) as Record<string, unknown> | null,
    logs: [],
    pendingApprovals: [],
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    error: run.error,
  };
}

export async function executeAgent(
  ctx: AgentContext,
  emit?: SSEEmitter
): Promise<AgentRunEntity> {
  const agentDef = AGENT_CATALOG.find((a) => a.id === ctx.agentId);
  if (!agentDef) {
    throw new Error(`Unknown agent: ${ctx.agentId}`);
  }
  if (!agentDef.available) {
    throw new Error(`Agent "${agentDef.name}" is not yet available`);
  }

  const run = await prisma.agentRun.create({
    data: {
      userId: ctx.userId,
      businessId: ctx.businessId,
      agentId: ctx.agentId,
      initiativeId: ctx.initiativeId ?? null,
      status: "RUNNING",
      input: ctx.parameters as any,
    },
  });

  const runEntity = toRunEntity(run);

  if (emit) {
    emit({ type: "run_started", run: runEntity });
  }

  try {
    await appendLog(run.id, makeLogEntry("info", `Starting ${agentDef.name}`), emit);

    if (emit) {
      emit({ type: "run_progress", runId: run.id, message: "Loading business context...", progress: 10 });
    }

    const bizCtx = await loadBusinessContext(ctx.businessId);
    await appendLog(run.id, makeLogEntry("info", "Business context loaded"), emit);

    if (emit) {
      emit({ type: "run_progress", runId: run.id, message: "Analyzing...", progress: 30 });
    }

    const systemPrompt = getAgentSystemPrompt(ctx.agentId, bizCtx, ctx.parameters);

    const model = new ChatAnthropic({
      model: "claude-sonnet-4-6",
      temperature: 1,
      maxTokens: 8000,
    });

    const userMessage = buildAgentUserMessage(ctx.agentId, bizCtx, ctx.parameters);

    await appendLog(run.id, makeLogEntry("info", "Calling LLM"), emit);

    if (emit) {
      emit({ type: "run_progress", runId: run.id, message: `${agentDef.name} is working...`, progress: 50 });
    }

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userMessage),
    ]);

    const content = typeof response.content === "string"
      ? response.content
      : Array.isArray(response.content)
        ? response.content
            .filter((b): b is { type: "text"; text: string } => typeof b === "object" && b !== null && "type" in b && b.type === "text")
            .map((b) => b.text)
            .join("")
        : "";

    await appendLog(run.id, makeLogEntry("info", "LLM response received"), emit);

    if (emit) {
      emit({ type: "run_progress", runId: run.id, message: "Processing results...", progress: 80 });
    }

    let output: Record<string, unknown>;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch
        ? (jsonMatch[1] ?? jsonMatch[0])
        : content;
      output = JSON.parse(jsonStr);
    } catch {
      output = { rawContent: content, parsed: false };
      await appendLog(run.id, makeLogEntry("warn", "Could not parse structured output, storing raw"), emit);
    }

    await writeBackResults(ctx.businessId, ctx.agentId, output);
    await appendLog(run.id, makeLogEntry("info", "Results written to business state"), emit);

    const completedRun = await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        output: output as any,
        completedAt: new Date(),
      },
    });

    const entity = toRunEntity(completedRun);

    if (emit) {
      emit({ type: "run_progress", runId: run.id, message: "Done!", progress: 100 });
      emit({ type: "run_completed", runId: run.id, output });
    }

    log.info(`Agent run ${run.id} completed (${ctx.agentId})`);
    return entity;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error(`Agent run ${run.id} failed: ${errMsg}`);

    await appendLog(run.id, makeLogEntry("error", `Failed: ${errMsg}`), emit);

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: errMsg,
        completedAt: new Date(),
      },
    });

    if (emit) {
      emit({ type: "run_failed", runId: run.id, error: errMsg });
    }

    return {
      ...runEntity,
      status: "failed",
      error: errMsg,
      completedAt: new Date().toISOString(),
    };
  }
}

function buildAgentUserMessage(
  agentId: string,
  biz: BusinessSnapshot,
  params: Record<string, unknown>
): string {
  const bizSummary = [
    `Business: ${biz.name}`,
    `Description: ${biz.description}`,
    `Industry: ${biz.industry}`,
    `Target Customer: ${biz.targetCustomer}`,
    `Value Proposition: ${biz.valueProposition}`,
    `Revenue Model: ${biz.revenueModel}`,
  ].join("\n");

  const plansSummary = biz.plans
    .map((p) => `### ${p.title}\n${p.summary}\n\n${p.rawMarkdown}`)
    .join("\n\n---\n\n");

  switch (agentId) {
    case "competitor-researcher": {
      const focus = params.focusArea ? `Focus area: ${params.focusArea}` : "General competitive analysis";
      const max = params.maxCompetitors ?? 5;
      return `${bizSummary}\n\n## Business Plans\n${plansSummary}\n\n## Task\n${focus}\nFind up to ${max} competitors and produce a detailed competitive analysis.\n\nReturn a JSON object with this structure:\n\`\`\`json\n{\n  "competitors": [\n    {\n      "name": "string",\n      "website": "string or null",\n      "positioning": "how they position themselves",\n      "strengths": ["strength1", "strength2"],\n      "weaknesses": ["weakness1", "weakness2"],\n      "pricing": "pricing info if available",\n      "differentiator": "what makes them different from ${biz.name}"\n    }\n  ],\n  "summary": "overall competitive landscape analysis",\n  "opportunities": ["opportunity the business can exploit"],\n  "threats": ["competitive threats to watch"]\n}\n\`\`\``;
    }

    case "content-drafter": {
      const contentType = params.contentType ?? "blog_post";
      const topic = params.topic ?? "general business topic";
      const dnaVoice = biz.dna
        ? `Brand voice tone: ${biz.dna.voiceTone}\nExamples: ${JSON.stringify(biz.dna.voiceExamples)}`
        : "No brand voice defined yet — use a professional, approachable tone.";

      return `${bizSummary}\n\n## Brand Voice\n${dnaVoice}\n\n## Business Plans\n${plansSummary}\n\n## Task\nCreate a ${contentType} about: ${topic}\n\nReturn a JSON object with this structure:\n\`\`\`json\n{\n  "contentType": "${contentType}",\n  "title": "compelling title",\n  "content": "the full content in markdown",\n  "summary": "1-2 sentence summary",\n  "targetAudience": "who this is for",\n  "callToAction": "suggested CTA",\n  "tags": ["tag1", "tag2"],\n  "socialSnippets": {\n    "twitter": "tweet-length version",\n    "linkedin": "linkedin post version"\n  }\n}\n\`\`\``;
    }

    case "lead-researcher": {
      const industry = params.industry ?? biz.industry;
      const location = params.location ?? "any";
      const max = params.maxLeads ?? 10;

      return `${bizSummary}\n\n## Business Plans\n${plansSummary}\n\n## Task\nResearch up to ${max} potential leads/customers matching the ICP.\nTarget industry: ${industry}\nLocation focus: ${location}\n\nReturn a JSON object with this structure:\n\`\`\`json\n{\n  "leads": [\n    {\n      "name": "contact or company name",\n      "company": "company name",\n      "role": "role/title if known",\n      "industry": "their industry",\n      "location": "location",\n      "whyGoodFit": "why they match the ICP",\n      "outreachAngle": "suggested approach angle",\n      "estimatedValue": "potential deal value range"\n    }\n  ],\n  "summary": "overall lead research findings",\n  "icpRefinement": "suggestions to refine ICP based on research"\n}\n\`\`\``;
    }

    default:
      return `${bizSummary}\n\nExecute the requested agent task with parameters: ${JSON.stringify(params)}`;
  }
}

async function writeBackResults(
  businessId: string,
  agentId: string,
  output: Record<string, unknown>
): Promise<void> {
  try {
    switch (agentId) {
      case "competitor-researcher": {
        if (output.summary && typeof output.summary === "string") {
          const plan = await prisma.businessPlan.findFirst({
            where: { businessId, aspectSlug: "product-service" },
          });
          if (plan) {
            const existingMd = plan.rawMarkdown || "";
            const competitorSection = `\n\n## Competitive Landscape (Agent Updated)\n\n${output.summary}\n\n${formatCompetitors(output.competitors as any[])}`;
            await prisma.businessPlan.update({
              where: { id: plan.id },
              data: { rawMarkdown: existingMd + competitorSection },
            });
          }
        }
        await prisma.decisionLog.create({
          data: {
            businessId,
            decision: "Competitive landscape updated by agent",
            reasoning: (output.summary as string) || "Agent completed competitor research",
            madeBy: "agent",
            agentId: "competitor-researcher",
          },
        });
        break;
      }

      case "content-drafter": {
        await prisma.decisionLog.create({
          data: {
            businessId,
            decision: `Content drafted: ${output.title ?? "Untitled"}`,
            reasoning: `${output.contentType ?? "content"} created by Content Drafter agent`,
            madeBy: "agent",
            agentId: "content-drafter",
          },
        });
        break;
      }

      case "lead-researcher": {
        const leads = output.leads;
        if (Array.isArray(leads) && leads.length > 0) {
          const plan = await prisma.businessPlan.findFirst({
            where: { businessId, aspectSlug: "customers-distribution" },
          });
          if (plan) {
            const existingMd = plan.rawMarkdown || "";
            const leadsSection = `\n\n## Leads Found (Agent Updated)\n\n${formatLeads(leads)}`;
            await prisma.businessPlan.update({
              where: { id: plan.id },
              data: { rawMarkdown: existingMd + leadsSection },
            });
          }
        }
        await prisma.decisionLog.create({
          data: {
            businessId,
            decision: `Lead research completed: ${Array.isArray(leads) ? leads.length : 0} leads found`,
            reasoning: (output.summary as string) || "Agent completed lead research",
            madeBy: "agent",
            agentId: "lead-researcher",
          },
        });
        break;
      }
    }
  } catch (err) {
    log.error(`Failed to write back results for ${agentId}:`, err);
  }
}

function formatCompetitors(competitors: { name: string; positioning: string; strengths: string[]; weaknesses: string[] }[] | undefined): string {
  if (!competitors?.length) return "_No competitors identified._";
  return competitors
    .map(
      (c) =>
        `### ${c.name}\n**Positioning:** ${c.positioning}\n**Strengths:** ${c.strengths?.join(", ") ?? "N/A"}\n**Weaknesses:** ${c.weaknesses?.join(", ") ?? "N/A"}`
    )
    .join("\n\n");
}

function formatLeads(leads: { name: string; company?: string; whyGoodFit?: string }[] | undefined): string {
  if (!leads?.length) return "_No leads found._";
  return leads
    .map(
      (l) =>
        `- **${l.name}**${l.company ? ` (${l.company})` : ""}: ${l.whyGoodFit ?? "Matches ICP"}`
    )
    .join("\n");
}

export async function getAgentRuns(
  userId: string,
  businessId?: string
): Promise<AgentRunEntity[]> {
  const where: Record<string, unknown> = { userId };
  if (businessId) where.businessId = businessId;

  const runs = await prisma.agentRun.findMany({
    where,
    include: { logs: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return runs.map((r) => ({
    ...toRunEntity(r),
    logs: r.logs.map((l) => ({
      timestamp: l.createdAt.toISOString(),
      level: l.level as "info" | "warn" | "error",
      message: l.message,
      tool: l.tool ?? undefined,
      data: (l.data as Record<string, unknown>) ?? undefined,
    })),
  }));
}
