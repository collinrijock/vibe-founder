import { Router, type Request, type Response, type NextFunction } from "express";
import { authRequired } from "../middleware/auth.js";
import { createLogger } from "../lib/logger.js";
import prisma from "../lib/prisma.js";
import { executeComposioAction } from "../services/composio.js";
import type { PendingApprovalEntity, ResolveApprovalRequest } from "@vibe-founder/shared";

const log = createLogger("approvals");

export const approvalsRouter = Router();

function mapApproval(a: {
  id: string;
  userId: string;
  businessId: string;
  agentRunId: string;
  tool: string;
  provider: string;
  action: string;
  description: string;
  riskLevel: string;
  preview: unknown;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
}): PendingApprovalEntity {
  return {
    id: a.id,
    userId: a.userId,
    businessId: a.businessId,
    agentRunId: a.agentRunId,
    tool: a.tool,
    provider: a.provider,
    action: a.action,
    description: a.description,
    riskLevel: a.riskLevel as PendingApprovalEntity["riskLevel"],
    preview: (a.preview ?? {}) as Record<string, unknown>,
    status: a.status.toLowerCase() as PendingApprovalEntity["status"],
    createdAt: a.createdAt.toISOString(),
    resolvedAt: a.resolvedAt?.toISOString() ?? null,
  };
}

approvalsRouter.get(
  "/",
  authRequired,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const status = req.query.status as string | undefined;

      const where: Record<string, unknown> = { userId };
      if (status) {
        where.status = status.toUpperCase();
      }

      const approvals = await prisma.pendingApproval.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json({
        approvals: approvals.map(mapApproval),
      });
    } catch (err) {
      log.error("Failed to list approvals", err);
      next(err);
    }
  }
);

approvalsRouter.get(
  "/pending",
  authRequired,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const approvals = await prisma.pendingApproval.findMany({
        where: { userId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        approvals: approvals.map(mapApproval),
        count: approvals.length,
      });
    } catch (err) {
      log.error("Failed to list pending approvals", err);
      next(err);
    }
  }
);

approvalsRouter.post(
  "/:id/resolve",
  authRequired,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const approvalId = req.params.id;
      const { decision, editedPayload } = req.body as ResolveApprovalRequest;

      if (!decision || !["approved", "rejected"].includes(decision)) {
        res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
        return;
      }

      const approval = await prisma.pendingApproval.findFirst({
        where: { id: approvalId, userId, status: "PENDING" },
      });

      if (!approval) {
        res.status(404).json({ error: "Pending approval not found" });
        return;
      }

      const updatedApproval = await prisma.pendingApproval.update({
        where: { id: approvalId },
        data: {
          status: decision === "approved" ? "APPROVED" : "REJECTED",
          resolvedAt: new Date(),
        },
      });

      if (decision === "approved") {
        const params = editedPayload || (approval.preview as Record<string, unknown>) || {};

        log.info(`Executing approved action: ${approval.tool} for user ${userId}`);

        const result = await executeComposioAction(
          userId,
          approval.tool,
          params
        );

        await prisma.agentRunLog.create({
          data: {
            runId: approval.agentRunId,
            level: result.success ? "info" : "error",
            message: result.success
              ? `Approved action ${approval.tool} executed successfully`
              : `Approved action ${approval.tool} failed: ${result.error}`,
            tool: approval.tool,
            data: result.data ? JSON.parse(JSON.stringify(result.data)) : undefined,
          },
        });

        if (!result.success) {
          log.warn(`Approved action ${approval.tool} failed: ${result.error}`);
        }
      } else {
        await prisma.agentRunLog.create({
          data: {
            runId: approval.agentRunId,
            level: "info",
            message: `Action ${approval.tool} rejected by user`,
            tool: approval.tool,
          },
        });
      }

      log.info(`Approval ${approvalId} resolved: ${decision}`);

      res.json({
        approval: mapApproval(updatedApproval),
      });
    } catch (err) {
      log.error("Failed to resolve approval", err);
      next(err);
    }
  }
);

export async function createPendingApproval(params: {
  userId: string;
  businessId: string;
  agentRunId: string;
  tool: string;
  provider: string;
  action: string;
  description: string;
  riskLevel: string;
  preview: Record<string, unknown>;
}): Promise<PendingApprovalEntity> {
  const approval = await prisma.pendingApproval.create({
    data: {
      userId: params.userId,
      businessId: params.businessId,
      agentRunId: params.agentRunId,
      tool: params.tool,
      provider: params.provider,
      action: params.action,
      description: params.description,
      riskLevel: params.riskLevel,
      preview: params.preview as any,
      status: "PENDING",
    },
  });

  log.info(`Pending approval created: ${approval.id} (${params.tool})`);
  return mapApproval(approval);
}
