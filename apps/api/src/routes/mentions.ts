import { Router, type Request, type Response } from "express";
import { authRequired } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

export const mentionsRouter = Router();

mentionsRouter.use(authRequired);

mentionsRouter.get("/resolve", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const mention = req.query.mention as string;

    if (!mention) {
      res.status(400).json({ error: "Missing mention parameter" });
      return;
    }

    const businesses = await prisma.business.findMany({
      where: { userId },
      include: { plans: true, todos: true },
    });

    const activeBusiness = businesses[0];
    if (!activeBusiness) {
      res.json({ context: null, type: "empty" });
      return;
    }

    switch (mention.toLowerCase()) {
      case "plan":
      case "full_plan": {
        const plans = activeBusiness.plans.map((p) => ({
          aspectSlug: p.aspectSlug,
          title: p.title,
          summary: p.summary,
          rawMarkdown: p.rawMarkdown,
        }));
        res.json({ type: "full_plan", context: plans });
        return;
      }
      case "competitors": {
        const plan = activeBusiness.plans.find((p) => p.aspectSlug === "product-service");
        res.json({ type: "competitors", context: plan?.rawMarkdown || "No competitive landscape data yet." });
        return;
      }
      case "pipeline": {
        const plan = activeBusiness.plans.find((p) => p.aspectSlug === "customers-distribution");
        res.json({ type: "pipeline", context: plan?.rawMarkdown || "No pipeline data yet." });
        return;
      }
      case "finances": {
        const plan = activeBusiness.plans.find((p) => p.aspectSlug === "finance-capital");
        const metrics = await prisma.metric.findMany({
          where: { businessId: activeBusiness.id },
          orderBy: { recordedAt: "desc" },
          take: 20,
        });
        res.json({
          type: "finances",
          context: {
            plan: plan?.rawMarkdown || "No financial plan yet.",
            metrics,
          },
        });
        return;
      }
      case "voice": {
        const dna = await prisma.businessDNA.findUnique({
          where: { businessId: activeBusiness.id },
        });
        if (dna) {
          res.json({
            type: "voice",
            context: {
              tone: dna.voiceTone,
              avoid: dna.voiceAvoid,
              examples: dna.voiceExamples,
            },
          });
          return;
        }
        const plan = activeBusiness.plans.find((p) => p.aspectSlug === "mission-principles-culture");
        res.json({ type: "voice", context: plan?.rawMarkdown || "No brand voice defined yet." });
        return;
      }
      default: {
        const plan = activeBusiness.plans.find(
          (p) => p.aspectSlug === mention || p.title.toLowerCase().includes(mention.toLowerCase())
        );
        if (plan) {
          res.json({
            type: "plan",
            context: {
              aspectSlug: plan.aspectSlug,
              title: plan.title,
              summary: plan.summary,
              rawMarkdown: plan.rawMarkdown,
            },
          });
          return;
        }
        res.json({ type: "unknown", context: null });
        return;
      }
    }
  } catch (error) {
    console.error("Mention resolve error:", error);
    res.status(500).json({ error: "Failed to resolve mention" });
  }
});
