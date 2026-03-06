import { Router, type Request, type Response, type NextFunction } from "express";
import { AGENT_CATALOG, type AgentBarSSEEvent, type StartAgentRunRequest } from "@vibe-founder/shared";
import { authRequired } from "../middleware/auth.js";
import { executeAgent, getAgentRuns } from "../services/agent-executor.js";
import { createLogger } from "../lib/logger.js";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "vibe-founder-local-dev-secret";
const log = createLogger("agents");

export const agentsRouter = Router();

interface SSEClient {
  userId: string;
  res: Response;
}

const sseClients: SSEClient[] = [];

function broadcastToUser(userId: string, event: AgentBarSSEEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    if (client.userId === userId) {
      client.res.write(data);
    }
  }
}

agentsRouter.get("/", (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ agents: AGENT_CATALOG });
  } catch (err) {
    log.error("Failed to list agents", err);
    next(err);
  }
});

agentsRouter.get("/events", (req: Request, res: Response) => {
  // EventSource can't set headers, so accept token via query param
  const tokenStr = (req.query.token as string) || req.headers.authorization?.slice(7);
  if (!tokenStr) {
    res.status(401).json({ error: "Missing auth token" });
    return;
  }

  let userId: string;
  try {
    const payload = jwt.verify(tokenStr, JWT_SECRET) as { userId: string };
    userId = payload.userId;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  const client: SSEClient = { userId, res };
  sseClients.push(client);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const idx = sseClients.indexOf(client);
    if (idx !== -1) sseClients.splice(idx, 1);
    log.info(`SSE client disconnected (${sseClients.length} remaining)`);
  });

  log.info(`SSE client connected for user ${userId} (${sseClients.length} total)`);
});

agentsRouter.get("/runs", authRequired, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const businessId = req.query.businessId as string | undefined;
    const runs = await getAgentRuns(userId, businessId);
    res.json({ runs });
  } catch (err) {
    log.error("Failed to list agent runs", err);
    next(err);
  }
});

agentsRouter.get("/runs/:runId", authRequired, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const run = await prisma.agentRun.findFirst({
      where: { id: req.params.runId, userId },
      include: {
        logs: { orderBy: { createdAt: "asc" } },
        approvals: true,
      },
    });

    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    res.json({ run });
  } catch (err) {
    log.error("Failed to get agent run", err);
    next(err);
  }
});

agentsRouter.post("/:id/run", authRequired, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const agentId = req.params.id;
  const { businessId, initiativeId, parameters } = req.body as Partial<StartAgentRunRequest>;

  if (!businessId) {
    res.status(400).json({ error: "businessId is required" });
    return;
  }

  const agentDef = AGENT_CATALOG.find((a) => a.id === agentId);
  if (!agentDef) {
    res.status(404).json({ error: `Agent "${agentId}" not found` });
    return;
  }

  if (!agentDef.available) {
    res.status(400).json({ error: `Agent "${agentDef.name}" is not yet available` });
    return;
  }

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (event: AgentBarSSEEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    broadcastToUser(userId, event);
  };

  try {
    const result = await executeAgent(
      {
        userId,
        businessId,
        agentId,
        initiativeId,
        parameters: parameters ?? {},
      },
      sendEvent
    );

    res.write(`data: ${JSON.stringify({ type: "done", run: result })}\n\n`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error(`Agent run failed for ${agentId}:`, err);
    res.write(`data: ${JSON.stringify({ type: "run_failed", runId: "unknown", error: errMsg })}\n\n`);
  }

  res.end();
});

agentsRouter.get("/:id/status", (req: Request, res: Response) => {
  const agentDef = AGENT_CATALOG.find((a) => a.id === req.params.id);
  if (!agentDef) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  res.json({ id: agentDef.id, name: agentDef.name, available: agentDef.available, status: "idle" });
});
