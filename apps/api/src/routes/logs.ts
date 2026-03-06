import { Router, type Request, type Response } from "express";
import { authRequired } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

export const logsRouter = Router();

logsRouter.use(authRequired);

logsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const category = (req.query.category as string) || undefined;
    const search = (req.query.search as string) || undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    const logs = await prisma.log.findMany({
      where: {
        userId,
        ...(category && { category }),
        ...(search && {
          message: { contains: search },
        }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json({
      logs: logs.map((l) => ({
        id: l.id,
        level: l.level,
        category: l.category,
        source: l.source,
        message: l.message,
        metadata: l.metadata,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to fetch logs",
    });
  }
});
