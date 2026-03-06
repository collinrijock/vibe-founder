import { Router, type Request, type Response } from "express";
import { HumanMessage } from "@langchain/core/messages";
import { authRequired } from "../middleware/auth.js";
import { getGraph } from "../graph/v1/agent.js";
import { createLogger } from "../lib/logger.js";
import { createExecLogger } from "../lib/copilot/execution-logs.js";
import { executeAgent } from "../services/agent-executor.js";

const log = createLogger("copilot");

export const copilotRouter = Router();

copilotRouter.use(authRequired);

interface CopilotRequestBody {
  message: string;
  threadId: string;
  model?: string;
}

copilotRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { message, threadId, model } = req.body as CopilotRequestBody;

    if (!message || !threadId) {
      res.status(400).json({ error: "message and threadId are required" });
      return;
    }

    const userId = req.user!.userId;

    const execLog = createExecLogger(userId, threadId);
    const requestStart = Date.now();
    const toolTimers = new Map<string, number>();
    const pendingLogs: Promise<void>[] = [];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const sendEvent = (data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent({
      type: "agent_start",
      threadId,
      message: "Processing request",
    });

    pendingLogs.push(execLog.requestStart());

    const graph = await getGraph();
    const config = {
      configurable: { thread_id: `${userId}:${threadId}`, model },
      recursionLimit: 150,
    };

    let streamedContent = "";

    try {
      const stream = graph.streamEvents(
        { messages: [new HumanMessage(message)] },
        { ...config, version: "v2" as const }
      );

      for await (const event of stream) {
        if (event.event === "on_chat_model_stream") {
          const isMainAgent =
            event.metadata?.langgraph_node === "agent";
          if (isMainAgent) {
            const chunk = event.data?.chunk;
            if (chunk?.content) {
              if (typeof chunk.content === "string") {
                if (chunk.content) {
                  streamedContent += chunk.content;
                  sendEvent({ type: "token", content: chunk.content });
                }
              } else if (Array.isArray(chunk.content)) {
                for (const block of chunk.content) {
                  if (block.type === "thinking" && block.thinking) {
                    sendEvent({ type: "thinking", content: block.thinking });
                  } else if (block.type === "text" && block.text) {
                    streamedContent += block.text;
                    sendEvent({ type: "token", content: block.text });
                  } else if (block.type === "tool_use") {
                    sendEvent({
                      type: "tool_call",
                      tool: block.name,
                      toolCallId: block.id,
                      args: block.input,
                    });
                  }
                }
              }
            }
          }
        }

        if (event.event === "on_tool_start") {
          toolTimers.set(event.run_id, Date.now());
          pendingLogs.push(execLog.toolStart(event.name, event.run_id));
          sendEvent({
            type: "tool_start",
            tool: event.name,
            runId: event.run_id,
          });
          if (event.name === "askFounderQuestions") {
            try {
              const rawInput = event.data?.input?.input;
              const parsed = typeof rawInput === "string" ? JSON.parse(rawInput) : rawInput;
              if (parsed?.questions) {
                sendEvent({
                  type: "questions",
                  questions: parsed.questions,
                });
              }
            } catch {
              log.error("Failed to parse askFounderQuestions input");
            }
          }

          if (event.name === "convertToBusiness") {
            try {
              const rawInput = event.data?.input?.input;
              const parsed = typeof rawInput === "string" ? JSON.parse(rawInput) : rawInput;
              if (parsed) {
                sendEvent({
                  type: "business_preview",
                  business: {
                    name: parsed.name,
                    description: parsed.description,
                    industry: parsed.industry,
                    targetCustomer: parsed.targetCustomer,
                    valueProposition: parsed.valueProposition,
                    revenueModel: parsed.revenueModel,
                  },
                });
              }
            } catch {
              log.error("Failed to parse convertToBusiness input");
            }
          }
        }

        if (event.event === "on_tool_end") {
          const startTime = toolTimers.get(event.run_id);
          const durationMs = startTime ? Date.now() - startTime : 0;
          toolTimers.delete(event.run_id);
          pendingLogs.push(execLog.toolEnd(event.name, durationMs, event.run_id));
          sendEvent({
            type: "tool_end",
            tool: event.name,
            runId: event.run_id,
          });

          if (event.name === "runAgent") {
            try {
              const rawOutput = event.data?.output;
              const parsed = typeof rawOutput === "string" ? JSON.parse(rawOutput) : rawOutput;
              if (parsed?.status === "queued" && parsed.agentId && parsed.businessId) {
                sendEvent({
                  type: "agent_run_start",
                  runId: "pending",
                  agentId: parsed.agentId,
                  agentName: parsed.agentId,
                });
                executeAgent(
                  {
                    userId,
                    businessId: parsed.businessId,
                    agentId: parsed.agentId,
                    parameters: parsed.parameters ?? {},
                  },
                  (agentEvent) => {
                    if (agentEvent.type === "run_completed" || agentEvent.type === "run_failed") {
                      sendEvent({
                        type: "agent_run_result",
                        runId: "runId" in agentEvent ? agentEvent.runId : "unknown",
                        status: agentEvent.type === "run_completed" ? "completed" : "failed",
                        result: agentEvent.type === "run_completed" ? agentEvent.output : undefined,
                        error: agentEvent.type === "run_failed" ? agentEvent.error : undefined,
                      });
                    } else if (agentEvent.type === "run_progress") {
                      sendEvent({
                        type: "agent_run_progress",
                        runId: agentEvent.runId,
                        message: agentEvent.message,
                        progress: agentEvent.progress,
                      });
                    }
                  }
                ).catch((err) => {
                  log.error("Background agent execution failed", err);
                });
              }
            } catch {
              log.error("Failed to parse runAgent output for background execution");
            }
          }
        }
      }

      // Content fallback: if streaming didn't capture content, read from final state
      if (!streamedContent) {
        try {
          const state = await graph.getState(config);
          const stateMessages = state.values?.messages;
          if (Array.isArray(stateMessages) && stateMessages.length > 0) {
            for (let i = stateMessages.length - 1; i >= 0; i--) {
              const msg = stateMessages[i];
              if (
                typeof msg._getType === "function" &&
                msg._getType() === "ai"
              ) {
                const content =
                  typeof msg.content === "string"
                    ? msg.content
                    : "";
                if (content) {
                  log.info("Using content fallback from state");
                  sendEvent({
                    type: "token",
                    content,
                  });
                  streamedContent = content;
                }
                break;
              }
            }
          }
        } catch (stateErr) {
          log.error("Failed to read fallback state", stateErr);
        }
      }

      sendEvent({ type: "done", threadId });
      pendingLogs.push(execLog.completion(Date.now() - requestStart));
    } catch (streamErr) {
      log.error("Stream error", streamErr);
      const errMsg = streamErr instanceof Error
        ? streamErr.message
        : "An error occurred during processing";
      pendingLogs.push(execLog.error(errMsg));
      sendEvent({
        type: "error",
        message: errMsg,
      });
    }

    // Flush all pending log writes before closing the response
    await Promise.allSettled(pendingLogs);

    res.end();
  } catch (err) {
    log.error("Copilot request failed", err);

    if (!res.headersSent) {
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Failed to process copilot request",
      });
    } else {
      res.end();
    }
  }
});

copilotRouter.get("/threads/:threadId/state", async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = req.user!.userId;
    const graph = await getGraph();
    const config = {
      configurable: { thread_id: `${userId}:${threadId}` },
    };

    const state = await graph.getState(config);

    if (!state.values?.messages?.length) {
      res.json({ messages: [] });
      return;
    }

    const messages = state.values.messages.map(
      (msg: { _getType: () => string; content: unknown }) => ({
        role: msg._getType() === "human" ? "user" : msg._getType() === "ai" ? "assistant" : msg._getType(),
        content:
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
      })
    );

    // Filter to only user/assistant messages for the frontend
    const filtered = messages.filter(
      (m: { role: string }) => m.role === "user" || m.role === "assistant"
    );

    res.json({ messages: filtered });
  } catch (err) {
    log.error("Failed to get thread state", err);
    res.status(500).json({ error: "Failed to get thread state" });
  }
});
