import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authRequired } from "../middleware/auth.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("sessions");

export const sessionsRouter = Router();

sessionsRouter.use(authRequired);

sessionsRouter.post("/", async (req, res) => {
  try {
    const { title, firstMessage } = req.body;

    if (!firstMessage) {
      res.status(400).json({ error: "firstMessage is required" });
      return;
    }

    const session = await prisma.chatSession.create({
      data: {
        userId: req.user!.userId,
        title: title || firstMessage.slice(0, 80),
        messages: {
          create: { role: "user", content: firstMessage },
        },
      },
      include: { messages: true },
    });

    res.status(201).json({ session });
  } catch (err) {
    log.error("Failed to create session", err, { userId: req.user?.userId });
    res.status(500).json({ error: "Failed to create session" });
  }
});

sessionsRouter.get("/", async (req, res) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });

    res.json({ sessions });
  } catch (err) {
    log.error("Failed to list sessions", err, { userId: req.user?.userId });
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

sessionsRouter.get("/:id", async (req, res) => {
  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({ session });
  } catch (err) {
    log.error("Failed to fetch session", err, { sessionId: req.params.id });
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

sessionsRouter.patch("/:id", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== "string") {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const updated = await prisma.chatSession.update({
      where: { id: session.id },
      data: { title: title.slice(0, 120) },
    });

    res.json({ session: updated });
  } catch (err) {
    log.error("Failed to rename session", err, { sessionId: req.params.id });
    res.status(500).json({ error: "Failed to rename session" });
  }
});

sessionsRouter.delete("/batch", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids array is required" });
      return;
    }

    await prisma.chatSession.deleteMany({
      where: { id: { in: ids }, userId: req.user!.userId },
    });

    res.json({ success: true });
  } catch (err) {
    log.error("Failed to batch delete sessions", err, { userId: req.user?.userId });
    res.status(500).json({ error: "Failed to batch delete sessions" });
  }
});

sessionsRouter.delete("/:id", async (req, res) => {
  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    await prisma.chatSession.delete({ where: { id: session.id } });

    res.json({ success: true });
  } catch (err) {
    log.error("Failed to delete session", err, { sessionId: req.params.id });
    res.status(500).json({ error: "Failed to delete session" });
  }
});

sessionsRouter.post("/:id/messages", async (req, res) => {
  try {
    const { role, content } = req.body;

    if (!role || !content) {
      res.status(400).json({ error: "role and content are required" });
      return;
    }

    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const message = await prisma.chatMessage.create({
      data: { sessionId: session.id, role, content },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ message });
  } catch (err) {
    log.error("Failed to save message", err, { sessionId: req.params.id });
    res.status(500).json({ error: "Failed to save message" });
  }
});
