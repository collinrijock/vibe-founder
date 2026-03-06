import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { authRequired, signToken } from "../middleware/auth.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("auth");

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      res.status(400).json({ error: "Email, name, and password are required" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hashed },
    });

    const token = signToken({ userId: user.id, email: user.email });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, stage: user.stage },
    });
  } catch (err) {
    log.error("Registration failed", err, { email: req.body?.email });
    res.status(500).json({ error: "Registration failed" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, stage: user.stage },
    });
  } catch (err) {
    log.error("Login failed", err, { email: req.body?.email });
    res.status(500).json({ error: "Login failed" });
  }
});

authRouter.get("/me", authRequired, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, stage: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (err) {
    log.error("Failed to fetch user", err, { userId: req.user?.userId });
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

authRouter.patch("/stage", authRequired, async (req, res) => {
  try {
    const { stage } = req.body;
    const validStages = [
      "ONBOARDING", "PRODUCT_DEFINITION", "CUSTOMER_DISCOVERY",
      "BUSINESS_MODEL", "OPERATIONS", "GROWTH", "SCALING",
    ];

    if (!stage || !validStages.includes(stage)) {
      res.status(400).json({ error: "Invalid stage", validStages });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { stage },
      select: { id: true, email: true, name: true, stage: true },
    });

    res.json({ user });
  } catch (err) {
    log.error("Failed to update stage", err, { userId: req.user?.userId, stage: req.body?.stage });
    res.status(500).json({ error: "Failed to update stage" });
  }
});
