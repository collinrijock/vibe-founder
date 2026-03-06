import { Router, type Request, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import prisma from "../lib/prisma.js";
import { authRequired } from "../middleware/auth.js";
import { createLogger } from "../lib/logger.js";
import { loadFoundersNotes } from "../services/markdown.js";
import type { BusinessExtraction, BusinessUpdatePatch } from "@vibe-founder/shared";

const log = createLogger("businesses");

export const businessesRouter = Router();
businessesRouter.use(authRequired);

const EXTRACTION_PROMPT = `You are a business data extraction engine. Analyze the conversation below between a founder and their AI advisor, along with the provided knowledge-base framework for each business aspect. Extract a comprehensive business plan into a structured JSON object covering ALL 7 aspects.

Return ONLY valid JSON (no markdown fences, no commentary) matching this exact schema:

{
  "name": "string — the business/company name, or a short descriptive name if none was stated",
  "description": "string — 1-3 sentence summary of what the business does",
  "industry": "string — the industry or market sector",
  "targetCustomer": "string — who the primary customer/user is",
  "valueProposition": "string — the core value the business delivers",
  "revenueModel": "string — how the business makes money",
  "aspects": [
    {
      "aspectSlug": "product-service | customers-distribution | business-model | operations | people-organization | mission-principles-culture | finance-capital",
      "title": "string — human-readable aspect title",
      "summary": "string — 1-3 sentence summary for this aspect",
      "actions": [
        {
          "title": "string",
          "description": "string",
          "priority": "high | medium | low",
          "status": "suggested | planned | active | done",
          "agentCapable": false
        }
      ],
      "systems": [
        {
          "title": "string",
          "type": "sop | automation",
          "playbook": "string — optional step-by-step process"
        }
      ],
      "rawMarkdown": "string — detailed notes for this aspect in markdown"
    }
  ]
}

Rules:
- You MUST generate ALL 7 aspects. Every aspect must appear in the output.
- For aspects directly discussed in the conversation, extract the specific details mentioned.
- For aspects NOT directly discussed, use the knowledge-base framework and what you know about the business to generate thoughtful initial recommendations, questions to explore, and suggested actions. Mark these actions as "suggested" status.
- Extract concrete actions mentioned or implied. Assign realistic priorities. Generate at least 2-3 actions per aspect.
- If the founder described processes or workflows, capture them as systems.
- rawMarkdown should be rich, well-structured markdown with headers, bullet points, and clear sections. Use ## for section headers, - for bullet lists, **bold** for emphasis.
- If a field has no data, use an empty string for strings or empty array for arrays.
- Do NOT wrap the JSON in markdown code fences.`;

businessesRouter.post("/extract", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body as { sessionId: string };
    const userId = req.user!.userId;

    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.messages.length === 0) {
      res.status(400).json({ error: "Session has no messages to extract from" });
      return;
    }

    const conversationText = session.messages
      .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join("\n\n");

    let knowledgeBaseContext = "";
    try {
      const notes = loadFoundersNotes();
      knowledgeBaseContext = notes
        .map((n) => `## ${n.title} (${n.slug})\n\n${n.rawMarkdown}`)
        .join("\n\n---\n\n");
    } catch (err) {
      log.warn("Could not load knowledge base for extraction enrichment", err);
    }

    const anthropic = new Anthropic();

    log.info(`Extracting business from session ${sessionId} (${session.messages.length} messages)`);

    const fullPrompt = knowledgeBaseContext
      ? `${EXTRACTION_PROMPT}\n\n--- KNOWLEDGE BASE FRAMEWORK ---\n\n${knowledgeBaseContext}\n\n--- CONVERSATION ---\n\n${conversationText}`
      : `${EXTRACTION_PROMPT}\n\n--- CONVERSATION ---\n\n${conversationText}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: "You are a JSON-only extraction engine. You MUST respond with ONLY a valid JSON object. No prose, no explanation, no markdown fences. Your entire response must be parseable by JSON.parse().",
      messages: [
        {
          role: "user",
          content: fullPrompt,
        },
        {
          role: "assistant",
          content: "{",
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      res.status(500).json({ error: "No text response from extraction" });
      return;
    }

    let extraction: BusinessExtraction;
    try {
      const raw = ("{" + textBlock.text).trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found in response");
      extraction = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      log.error("Failed to parse extraction JSON", {
        error: parseErr,
        rawPreview: textBlock.text.slice(0, 200),
      });
      res.status(500).json({ error: "Failed to parse business extraction" });
      return;
    }

    const business = await prisma.business.create({
      data: {
        userId,
        name: extraction.name || session.title || "Untitled Business",
        description: extraction.description || "",
        industry: extraction.industry || "",
        targetCustomer: extraction.targetCustomer || "",
        valueProposition: extraction.valueProposition || "",
        revenueModel: extraction.revenueModel || "",
        sourceSessionId: sessionId,
        rawExtraction: extraction as any,
        plans: {
          create: (extraction.aspects || []).map((aspect) => ({
            aspectSlug: aspect.aspectSlug,
            title: aspect.title,
            summary: aspect.summary || "",
            actions: JSON.parse(JSON.stringify(
              (aspect.actions || []).map((a, i) => ({ id: `action-${i}`, ...a }))
            )),
            systems: JSON.parse(JSON.stringify(
              (aspect.systems || []).map((s, i) => ({ id: `system-${i}`, ...s }))
            )),
            rawMarkdown: aspect.rawMarkdown || "",
          })),
        },
      },
    });

    const todoData = (extraction.aspects || []).flatMap((aspect) =>
      (aspect.actions || []).map((action) => ({
        businessId: business.id,
        title: action.title,
        description: action.description || "",
        priority: action.priority || "medium",
        status: action.status === "done" ? ("done" as const) : ("pending" as const),
        aspectSlug: aspect.aspectSlug,
      }))
    );

    if (todoData.length > 0) {
      await prisma.todo.createMany({ data: todoData });
    }

    const fullBusiness = await prisma.business.findUnique({
      where: { id: business.id },
      include: { plans: true, todos: true },
    });

    log.info(`Created business ${business.id} with ${fullBusiness?.plans.length ?? 0} plans`);

    res.status(201).json({ business: fullBusiness });
  } catch (err) {
    log.error("Business extraction failed", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Business extraction failed",
    });
  }
});

const UPDATE_PROMPT = `You are a business plan update engine. You receive the current state of a founder's business plan and a natural-language update from the founder describing something that changed.

Your job: determine exactly what changed and return a surgical JSON patch. Only include fields/aspects that actually need updating. Do NOT rewrite things that are still accurate.

Return ONLY valid JSON (no markdown fences, no commentary) matching this schema:

{
  "businessFields": { /* ONLY include top-level fields that changed: name, description, industry, targetCustomer, valueProposition, revenueModel */ },
  "plans": [
    {
      "aspectSlug": "one of: product-service | customers-distribution | business-model | operations | people-organization | mission-principles-culture | finance-capital",
      "summary": "updated summary — only if changed",
      "actions": [
        {
          "title": "string",
          "description": "string",
          "priority": "high | medium | low",
          "status": "suggested | planned | active | done",
          "agentCapable": false
        }
      ],
      "systems": [
        {
          "title": "string",
          "type": "sop | automation",
          "playbook": "string — optional"
        }
      ],
      "rawMarkdown": "updated markdown — only if changed"
    }
  ],
  "todosToAdd": [
    {
      "title": "string",
      "description": "string",
      "priority": "high | medium | low",
      "aspectSlug": "string"
    }
  ],
  "todosToUpdate": [
    { "id": "existing-todo-id", "status": "done" }
  ],
  "todosToRemove": ["todo-id-to-remove"],
  "changeSummary": "1-2 sentence human-readable summary of what was updated and why"
}

Rules:
- Only include "businessFields" if a top-level field actually changed. Omit the key entirely if nothing changed.
- Only include aspects in "plans" that were affected by the update. If an aspect didn't change, don't include it.
- When you include an aspect in "plans", provide the FULL updated actions and systems arrays (not a partial diff) since they replace the existing ones.
- For "todosToAdd", create new action items implied by the update.
- For "todosToUpdate", reference existing todo IDs and set their new status. Mark todos as "done" if the update implies they were completed.
- For "todosToRemove", list IDs of todos that are no longer relevant. Prefer marking as "done" over removing.
- "changeSummary" should be concise and tell the founder what was updated.
- Do NOT wrap the JSON in markdown code fences.
- If the update doesn't imply any real changes, return: { "changeSummary": "No changes detected from this update." } with empty/omitted arrays.`;

businessesRouter.post("/:businessId/update", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { businessId } = req.params;
    const { message } = req.body as { message: string };

    if (!message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId },
      include: { plans: true, todos: { orderBy: { createdAt: "asc" } } },
    });

    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    const businessState = JSON.stringify({
      name: business.name,
      description: business.description,
      industry: business.industry,
      targetCustomer: business.targetCustomer,
      valueProposition: business.valueProposition,
      revenueModel: business.revenueModel,
      plans: business.plans.map((p) => ({
        aspectSlug: p.aspectSlug,
        title: p.title,
        summary: p.summary,
        actions: p.actions,
        systems: p.systems,
        rawMarkdown: p.rawMarkdown,
      })),
      todos: business.todos.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        aspectSlug: t.aspectSlug,
      })),
    }, null, 2);

    const anthropic = new Anthropic();

    log.info(`Processing update for business ${businessId}: "${message.slice(0, 100)}"`);

    const fullPrompt = `${UPDATE_PROMPT}\n\n--- CURRENT BUSINESS STATE ---\n\n${businessState}\n\n--- FOUNDER'S UPDATE ---\n\n${message}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: "You are a JSON-only extraction engine. You MUST respond with ONLY a valid JSON object. No prose, no explanation, no markdown fences. Your entire response must be parseable by JSON.parse().",
      messages: [
        { role: "user", content: fullPrompt },
        { role: "assistant", content: "{" },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      res.status(500).json({ error: "No text response from update analysis" });
      return;
    }

    let patch: BusinessUpdatePatch;
    try {
      const raw = ("{" + textBlock.text).trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found in response");
      patch = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      log.error("Failed to parse update JSON", {
        error: parseErr,
        rawPreview: textBlock.text.slice(0, 200),
      });
      res.status(500).json({ error: "Failed to parse business update" });
      return;
    }

    if (patch.businessFields && Object.keys(patch.businessFields).length > 0) {
      await prisma.business.update({
        where: { id: businessId },
        data: patch.businessFields,
      });
    }

    if (patch.plans && patch.plans.length > 0) {
      for (const planPatch of patch.plans) {
        const existingPlan = business.plans.find((p) => p.aspectSlug === planPatch.aspectSlug);
        if (!existingPlan) continue;

        const data: Record<string, unknown> = {};
        if (planPatch.summary !== undefined) data.summary = planPatch.summary;
        if (planPatch.rawMarkdown !== undefined) data.rawMarkdown = planPatch.rawMarkdown;
        if (planPatch.actions !== undefined) {
          data.actions = JSON.parse(JSON.stringify(
            planPatch.actions.map((a, i) => ({ id: `action-${i}`, ...a }))
          ));
        }
        if (planPatch.systems !== undefined) {
          data.systems = JSON.parse(JSON.stringify(
            planPatch.systems.map((s, i) => ({ id: `system-${i}`, ...s }))
          ));
        }

        if (Object.keys(data).length > 0) {
          await prisma.businessPlan.update({
            where: { id: existingPlan.id },
            data,
          });
        }
      }
    }

    if (patch.todosToAdd && patch.todosToAdd.length > 0) {
      await prisma.todo.createMany({
        data: patch.todosToAdd.map((t) => ({
          businessId,
          title: t.title,
          description: t.description || "",
          priority: t.priority || "medium",
          status: "pending",
          aspectSlug: t.aspectSlug,
        })),
      });
    }

    if (patch.todosToUpdate && patch.todosToUpdate.length > 0) {
      for (const t of patch.todosToUpdate) {
        await prisma.todo.update({
          where: { id: t.id, businessId },
          data: { status: t.status },
        }).catch((err) => {
          log.warn(`Could not update todo ${t.id}`, err);
        });
      }
    }

    if (patch.todosToRemove && patch.todosToRemove.length > 0) {
      await prisma.todo.deleteMany({
        where: { id: { in: patch.todosToRemove }, businessId },
      });
    }

    const updatedBusiness = await prisma.business.findUnique({
      where: { id: businessId },
      include: { plans: true, todos: { orderBy: { createdAt: "asc" } } },
    });

    log.info(`Updated business ${businessId}: ${patch.changeSummary}`);

    res.json({
      business: updatedBusiness,
      changeSummary: patch.changeSummary,
    });
  } catch (err) {
    log.error("Business update failed", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Business update failed",
    });
  }
});

businessesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const businesses = await prisma.business.findMany({
      where: { userId },
      include: { plans: true, todos: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ businesses });
  } catch (err) {
    log.error("Failed to list businesses", err);
    res.status(500).json({ error: "Failed to list businesses" });
  }
});

businessesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const business = await prisma.business.findFirst({
      where: { id: req.params.id, userId },
      include: { plans: true, todos: { orderBy: { createdAt: "asc" } } },
    });

    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    res.json({ business });
  } catch (err) {
    log.error("Failed to get business", err);
    res.status(500).json({ error: "Failed to get business" });
  }
});

businessesRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const business = await prisma.business.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    await prisma.business.delete({ where: { id: business.id } });
    res.json({ success: true });
  } catch (err) {
    log.error("Failed to delete business", err);
    res.status(500).json({ error: "Failed to delete business" });
  }
});

businessesRouter.patch("/:businessId/todos/:todoId", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { businessId, todoId } = req.params;
    const { status } = req.body as { status: string };

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId },
    });

    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    const todo = await prisma.todo.update({
      where: { id: todoId, businessId },
      data: { status: status as any },
    });

    res.json({ todo });
  } catch (err) {
    log.error("Failed to update todo", err);
    res.status(500).json({ error: "Failed to update todo" });
  }
});
