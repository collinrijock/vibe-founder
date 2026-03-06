import { useState, useCallback, useRef, useEffect } from "react";

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface QuestionOption {
  id: string;
  label: string;
}

export interface FounderQuestion {
  id: string;
  prompt: string;
  options: QuestionOption[];
  allowMultiple?: boolean;
}

export interface BusinessPreview {
  name: string;
  description: string;
  industry: string;
  targetCustomer: string;
  valueProposition: string;
  revenueModel: string;
}

export interface DebugLogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: Record<string, unknown>;
}

interface UseCopilotOptions {
  threadId: string;
  token: string | null;
  model?: string;
  initialMessages?: CopilotMessage[];
}

interface SSEEvent {
  type: string;
  content?: string;
  tool?: string;
  toolCallId?: string;
  args?: Record<string, unknown>;
  message?: string;
  threadId?: string;
  runId?: string;
  questions?: unknown[];
  business?: BusinessPreview;
}

let messageIdCounter = 0;
function nextId(): string {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

const DRIP_CHARS_PER_FRAME = 3;
const DRIP_INTERVAL_MS = 12;

export function useCopilot({
  threadId,
  token,
  model,
  initialMessages = [],
}: UseCopilotOptions) {
  const [messages, setMessages] = useState<CopilotMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [thinkingContent, setThinkingContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<FounderQuestion[] | null>(null);
  const [pendingBusinessPreview, setPendingBusinessPreview] = useState<BusinessPreview | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const toolTimersRef = useRef<Map<string, number>>(new Map());
  const usedThreadIdsRef = useRef<Set<string>>(new Set());

  const tokenQueueRef = useRef<string[]>([]);
  const renderedContentRef = useRef("");
  const assistantIdRef = useRef<string | null>(null);
  const dripTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamDoneRef = useRef(false);

  const pushLog = useCallback(
    (level: string, message: string, data?: Record<string, unknown>) => {
      setDebugLogs((prev) => [
        ...prev,
        { timestamp: new Date().toISOString(), level, message, data },
      ]);
    },
    []
  );

  const flushQueue = useCallback(() => {
    const queue = tokenQueueRef.current;
    const id = assistantIdRef.current;
    if (!id || queue.length === 0) {
      dripTimerRef.current = null;
      return;
    }

    const chars = queue.splice(0, DRIP_CHARS_PER_FRAME).join("");
    renderedContentRef.current += chars;
    const snapshot = renderedContentRef.current;

    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.id === id) {
        return [...prev.slice(0, -1), { ...last, content: snapshot }];
      }
      return [...prev, { id, role: "assistant", content: snapshot }];
    });

    if (queue.length > 0) {
      const speed = streamDoneRef.current
        ? 0
        : Math.max(DRIP_INTERVAL_MS - Math.floor(queue.length / 10), 4);
      dripTimerRef.current = setTimeout(flushQueue, speed);
    } else {
      dripTimerRef.current = null;
    }
  }, []);

  const enqueueTokens = useCallback(
    (text: string) => {
      for (const ch of text) {
        tokenQueueRef.current.push(ch);
      }
      if (!dripTimerRef.current) {
        dripTimerRef.current = setTimeout(flushQueue, DRIP_INTERVAL_MS);
      }
    },
    [flushQueue]
  );

  const flushAllImmediate = useCallback(() => {
    if (dripTimerRef.current) {
      clearTimeout(dripTimerRef.current);
      dripTimerRef.current = null;
    }
    const queue = tokenQueueRef.current;
    const id = assistantIdRef.current;
    if (!id || queue.length === 0) return;

    renderedContentRef.current += queue.join("");
    queue.length = 0;
    const snapshot = renderedContentRef.current;

    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.id === id) {
        return [...prev.slice(0, -1), { ...last, content: snapshot }];
      }
      return [...prev, { id, role: "assistant", content: snapshot }];
    });
  }, []);

  useEffect(() => {
    return () => {
      if (dripTimerRef.current) clearTimeout(dripTimerRef.current);
    };
  }, []);

  const sendMessage = useCallback(
    async (content: string, displayContent?: string) => {
      if (!content.trim() || isStreaming) return;

      setError(null);
      setIsStreaming(true);
      setThinkingContent("");
      setDebugLogs([]);
      setPendingQuestions(null);
      setPendingBusinessPreview(null);

      tokenQueueRef.current = [];
      renderedContentRef.current = "";
      streamDoneRef.current = false;
      usedThreadIdsRef.current.add(threadId);

      const userMessage: CopilotMessage = {
        id: nextId(),
        role: "user",
        content: (displayContent ?? content).trim(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const assistantId = nextId();
      assistantIdRef.current = assistantId;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/copilot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: content.trim(),
            threadId,
            ...(model ? { model } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(
            errorBody?.error || `Request failed with status ${response.status}`
          );
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            let event: SSEEvent;
            try {
              event = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            switch (event.type) {
              case "agent_start":
                pushLog("info", "Agent started", { threadId: event.threadId });
                break;

              case "token":
                if (event.content) {
                  enqueueTokens(event.content);
                }
                break;

              case "thinking":
                if (event.content) {
                  setThinkingContent((prev) => prev + event.content);
                }
                break;

              case "tool_call":
                if (event.tool) {
                  pushLog("info", `Tool call: ${event.tool}`, {
                    tool: event.tool,
                    toolCallId: event.toolCallId,
                    args: event.args,
                  });
                }
                break;

              case "tool_start":
                if (event.tool) {
                  toolTimersRef.current.set(event.runId || event.tool, Date.now());
                  pushLog("info", `Tool started: ${event.tool}`, { tool: event.tool, runId: event.runId });
                  setActiveTools((prev) =>
                    prev.includes(event.tool!) ? prev : [...prev, event.tool!]
                  );
                }
                break;

              case "tool_end":
                if (event.tool) {
                  const key = event.runId || event.tool;
                  const startTime = toolTimersRef.current.get(key);
                  const durationMs = startTime ? Date.now() - startTime : undefined;
                  toolTimersRef.current.delete(key);
                  pushLog("info", `Tool ended: ${event.tool}`, { tool: event.tool, runId: event.runId, durationMs });
                  setActiveTools((prev) =>
                    prev.filter((t) => t !== event.tool)
                  );
                }
                break;

              case "error":
                pushLog("error", event.message || "An error occurred", { raw: event });
                setError(event.message || "An error occurred");
                break;

              case "done":
                pushLog("info", "Stream completed");
                streamDoneRef.current = true;
                break;

              case "questions":
                if (event.questions) {
                  setPendingQuestions(event.questions as FounderQuestion[]);
                  pushLog("info", "Questions presented to founder", {
                    count: (event.questions as FounderQuestion[]).length,
                  });
                }
                break;

              case "business_preview":
                if (event.business) {
                  setPendingBusinessPreview(event.business);
                  pushLog("info", "Business preview presented to founder", {
                    name: event.business.name,
                  });
                }
                break;
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          flushAllImmediate();
        } else {
          const msg =
            err instanceof Error ? err.message : "Something went wrong";
          setError(msg);
        }
      } finally {
        streamDoneRef.current = true;
        flushAllImmediate();
        setIsStreaming(false);
        setActiveTools([]);
        setThinkingContent("");
        abortRef.current = null;
        assistantIdRef.current = null;
      }
    },
    [threadId, token, model, isStreaming, pushLog, enqueueTokens, flushAllImmediate]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    isStreaming,
    activeTools,
    thinkingContent,
    error,
    debugLogs,
    pendingQuestions,
    setPendingQuestions,
    pendingBusinessPreview,
    setPendingBusinessPreview,
    usedThreadIds: usedThreadIdsRef,
    stop,
    clearMessages,
    setMessages,
  };
}
