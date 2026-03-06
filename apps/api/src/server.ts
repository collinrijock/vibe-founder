import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import express from "express";
import cors from "cors";
import { aspectsRouter } from "./routes/aspects.js";
import { agentsRouter } from "./routes/agents.js";
import { authRouter } from "./routes/auth.js";
import { sessionsRouter } from "./routes/sessions.js";
import { copilotRouter } from "./routes/copilot.js";
import { logsRouter } from "./routes/logs.js";
import { businessesRouter } from "./routes/businesses.js";
import { mentionsRouter } from "./routes/mentions.js";
import { getVectorStore } from "./services/vectorstore.js";
import prisma from "./lib/prisma.js";
import { createLogger } from "./lib/logger.js";
import { requestLogger, globalErrorHandler } from "./middleware/logging.js";

const log = createLogger("server");
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/api/health", (_req, res) => {
  const hasKey = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your-api-key-here";
  res.json({ status: "ok", anthropicKeySet: hasKey });
});

app.use("/api/auth", authRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/copilot", copilotRouter);
app.use("/api/aspects", aspectsRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/logs", logsRouter);
app.use("/api/businesses", businessesRouter);
app.use("/api/mentions", mentionsRouter);

app.use(globalErrorHandler);

process.on("uncaughtException", (err) => {
  log.error("Uncaught exception — process will exit", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  log.error("Unhandled promise rejection", reason instanceof Error ? reason : new Error(String(reason)));
});

app.listen(PORT, async () => {
  log.info(`API server running on http://localhost:${PORT}`);

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your-api-key-here") {
    log.warn("ANTHROPIC_API_KEY is not set — chat will not work. Set it in .env at the repo root.");
  }

  try {
    await prisma.$connect();
    log.info("Database connected");
  } catch (err) {
    log.error("Database connection failed", err);
  }

  try {
    await getVectorStore();
  } catch (err) {
    log.error("Failed to initialize vector store", err);
  }
});
