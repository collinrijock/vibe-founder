import { useRef, useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useCopilot, type CopilotMessage, type DebugLogEntry } from "@/hooks/useCopilot";
import { QuestionWidget } from "@/components/QuestionWidget";
import { BusinessPreviewWidget } from "@/components/BusinessPreviewWidget";
import { useBusinessCreation } from "@/lib/business-creation";

const MODEL_OPTIONS: SelectOption[] = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
];

const TOOL_LABELS: Record<string, string> = {
  searchNotes: "Searching notes",
  loadAspect: "Loading aspect",
  loadAllNotes: "Loading all notes",
  listAspects: "Listing aspects",
  identifyGaps: "Analyzing gaps",
  prioritizeActions: "Prioritizing actions",
  listAgents: "Checking agents",
  runAgent: "Running agent",
  loadSkill: "Loading skill",
  askFounderQuestions: "Preparing questions",
  convertToBusiness: "Preparing business summary",
};

const suggestions = [
  "Analyze my business",
  "What are my biggest gaps?",
  "Create a playbook for customer acquisition",
  "How should I prioritize my next hires?",
];

// ---------------------------------------------------------------------------
// Copy Logs — types, fetch, format, button
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Code block with copy button
// ---------------------------------------------------------------------------

function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") || "";
  const code = String(children).replace(/\n$/, "");

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="group relative">
      {language && (
        <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-muted/80 px-4 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className={cn(
          "overflow-x-auto bg-muted/50 p-4 text-sm leading-relaxed",
          language ? "rounded-b-lg border border-t-0 border-border" : "rounded-lg border border-border"
        )}>
          <code className={className}>{code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100"
          title="Copy code"
        >
          {copied ? <FaIcon icon="fa-solid fa-clipboard-check" className="text-[11px]" /> : <FaIcon icon="fa-regular fa-clipboard" className="text-[11px]" />}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown component overrides for rich rendering
// ---------------------------------------------------------------------------

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-6 text-xl font-bold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-5 text-lg font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-2 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 ml-4 list-disc space-y-1 marker:text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-4 list-decimal space-y-1 marker:text-muted-foreground">{children}</ol>
  ),
  li: ({ children, ...props }) => {
    const className = props.className || "";
    if (className.includes("task-list-item")) {
      return <li className="flex items-start gap-2 list-none -ml-4">{children}</li>;
    }
    return <li className="leading-relaxed">{children}</li>;
  },
  input: ({ checked, ...props }) => {
    if (props.type === "checkbox") {
      return (
        <span className={cn(
          "mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground"
        )}>
          {checked && <FaIcon icon="fa-solid fa-check" className="text-[10px]" />}
        </span>
      );
    }
    return <input {...props} />;
  },
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-primary/50 pl-4 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="mt-6 mb-8 border-border" />
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border bg-muted/50">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-border px-3 py-2">{children}</td>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.startsWith("language-") ||
      (typeof children === "string" && children.includes("\n"));

    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }

    return (
      <code
        className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    return <>{children}</>;
  },
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),
};

function normalizeMarkdown(content: string): string {
  return content.replace(/^(\s*)\[( |x)\] /gm, "$1- [$2] ");
}

interface BackendLogEntry {
  id: string;
  level: string;
  category: string;
  source: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

async function fetchBackendLogs(
  token: string,
  threadIds: string[]
): Promise<BackendLogEntry[]> {
  try {
    const allLogs: BackendLogEntry[] = [];
    for (const tid of threadIds) {
      const params = new URLSearchParams({
        category: "COPILOT",
        search: tid,
        limit: "200",
      });
      const response = await fetch(`/api/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (data.logs) allLogs.push(...data.logs);
    }
    return allLogs;
  } catch {
    return [];
  }
}

function formatThreadLogs(
  threadId: string,
  messages: CopilotMessage[],
  debugLogs: DebugLogEntry[] = [],
  backendLogs: BackendLogEntry[] = []
): string {
  const lines: string[] = [];

  // Header
  lines.push("=".repeat(60));
  lines.push("COPILOT THREAD LOG");
  lines.push("=".repeat(60));
  lines.push(`Thread ID: ${threadId}`);
  lines.push(`Messages:  ${messages.length}`);
  lines.push(`Exported:  ${new Date().toISOString()}`);
  lines.push("");

  // Conversation
  lines.push("-".repeat(60));
  lines.push("CONVERSATION");
  lines.push("-".repeat(60));
  for (const msg of messages) {
    lines.push(`[${msg.role.toUpperCase()}]`);
    lines.push(msg.content);
    lines.push("");
  }

  // Debug logs (real-time SSE events captured in-memory)
  if (debugLogs.length > 0) {
    lines.push("-".repeat(60));
    lines.push("EXECUTION LOGS (client-side)");
    lines.push("-".repeat(60));
    for (const entry of debugLogs) {
      const ts = entry.timestamp.split("T")[1]?.replace("Z", "") || entry.timestamp;
      const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
      lines.push(`${ts} [${entry.level.toUpperCase()}] ${entry.message}${dataStr}`);
    }
    lines.push("");
  }

  // Backend logs (persisted execution trace from DB)
  if (backendLogs.length > 0) {
    const sorted = [...backendLogs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    lines.push("-".repeat(60));
    lines.push("EXECUTION TRACE (backend)");
    lines.push("-".repeat(60));
    for (const entry of sorted) {
      const ts = entry.createdAt.split("T")[1]?.replace("Z", "") || entry.createdAt;
      const meta = entry.metadata || {};
      const parts = [`${ts} [${entry.level.toUpperCase()}]`];

      if (meta.execType) parts.push(`<${meta.execType}>`);
      if (meta.agent) parts.push(`agent=${meta.agent}`);
      if (meta.toolName) parts.push(`tool=${meta.toolName}`);
      if (meta.durationMs !== undefined) parts.push(`${meta.durationMs}ms`);
      if (meta.error) parts.push(`error="${meta.error}"`);

      parts.push(entry.message);
      lines.push(parts.join(" "));
    }
    lines.push("");
  }

  lines.push("=".repeat(60));
  return lines.join("\n");
}

function CopyLogsButton({
  threadId,
  messages,
  debugLogs,
  token,
  usedThreadIds,
}: {
  threadId: string;
  messages: CopilotMessage[];
  debugLogs: DebugLogEntry[];
  token: string | null;
  usedThreadIds: React.RefObject<Set<string>>;
}) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = useCallback(async () => {
    if (loading || !token) return;
    setLoading(true);
    try {
      const ids = [threadId, ...usedThreadIds.current];
      const uniqueIds = [...new Set(ids)];
      const backendLogs = await fetchBackendLogs(token, uniqueIds);
      const text = formatThreadLogs(threadId, messages, debugLogs, backendLogs);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail — clipboard may not be available
    } finally {
      setLoading(false);
    }
  }, [loading, token, threadId, messages, debugLogs, usedThreadIds]);

  return (
    <button
      onClick={handleCopy}
      disabled={loading || messages.length === 0}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        copied && "text-green-500"
      )}
      title="Copy thread logs to clipboard"
    >
      {loading ? (
        <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-sm" />
      ) : copied ? (
        <FaIcon icon="fa-solid fa-check" className="text-sm" />
      ) : (
        <FaIcon icon="fa-regular fa-copy" className="text-sm" />
      )}
    </button>
  );
}

function ConvertToBusinessButton({
  sessionId,
  token,
  disabled,
  onConverted,
}: {
  sessionId: string | undefined;
  token: string | null;
  disabled: boolean;
  onConverted: (businessId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const overlay = useBusinessCreation();

  const handleConvert = useCallback(async () => {
    if (loading || !token || !sessionId) return;
    setLoading(true);
    overlay.show();
    try {
      const res = await fetch("/api/businesses/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Extraction failed");
      }
      const data = await res.json();
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ["businesses"] });

      navigate(`/business/${data.business.id}`);

      await new Promise((r) => setTimeout(r, 600));

      overlay.finish();
    } catch {
      overlay.hide();
    } finally {
      setLoading(false);
    }
  }, [loading, token, sessionId, navigate, queryClient, overlay]);

  return (
    <button
      onClick={handleConvert}
      disabled={loading || disabled || !sessionId}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        done && "text-green-500"
      )}
      title="Convert this conversation into a business"
    >
      {loading ? (
        <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-sm" />
      ) : done ? (
        <FaIcon icon="fa-solid fa-check" className="text-sm" />
      ) : (
        <FaIcon icon="fa-solid fa-building" className="text-sm" />
      )}
      <span>{loading ? "Extracting..." : done ? "Created!" : "Convert to Business"}</span>
    </button>
  );
}

export default function ChatPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const autoSend = (location.state as { autoSend?: string } | null)?.autoSend;

  const { data: session, isLoading: sessionLoading } = useQuery<{
    id: string;
    title: string;
    messages: { id: string; role: string; content: string }[];
  } | null>({
    queryKey: ["session", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.session;
    },
  });

  if (sessionId && sessionLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-base text-muted-foreground" />
      </div>
    );
  }

  const initialMessages: CopilotMessage[] =
    session?.messages?.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
    })) || [];

  return (
    <ChatView
      key={sessionId || "new-chat"}
      sessionId={sessionId}
      token={token}
      initialMessages={autoSend ? [] : initialMessages}
      autoSend={autoSend}
      navigate={navigate}
      queryClient={queryClient}
    />
  );
}

function ChatView({
  sessionId: initialSessionId,
  token,
  initialMessages,
  autoSend,
  navigate,
  queryClient,
}: {
  sessionId?: string;
  token: string | null;
  initialMessages: CopilotMessage[];
  autoSend?: string;
  navigate: ReturnType<typeof useNavigate>;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("claude-opus-4-6");

  const [stableThreadId] = useState(() => `new_${Date.now()}`);
  const threadId = currentSessionId || stableThreadId;

  const {
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
    usedThreadIds,
    stop,
  } = useCopilot({
    threadId,
    token,
    model,
    initialMessages,
  });

  const saveMessageMutation = useMutation({
    mutationFn: async ({
      sessionId,
      role,
      content,
    }: {
      sessionId: string;
      role: string;
      content: string;
    }) => {
      await fetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, content }),
      });
    },
  });

  // Auto-send the first message to the copilot when arriving from onboarding
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (autoSend && !autoSentRef.current) {
      autoSentRef.current = true;
      sendMessage(autoSend);
    }
  }, [autoSend, sendMessage]);

  const handleSend = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content) return;

      setInput("");

      // Fire the stream first, then create the session in the background.
      // This avoids thread-id mismatches and component remounts that kill the stream.
      const streamPromise = sendMessage(content);

      let sid = currentSessionId;
      if (!sid) {
        try {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ firstMessage: content }),
          });
          if (res.ok) {
            const data = await res.json();
            sid = data.session.id;
            setCurrentSessionId(sid);
            queryClient.invalidateQueries({ queryKey: ["sessions"] });
            // Update the URL immediately so "New Chat" navigates correctly.
            window.history.replaceState(null, "", `/chat/${sid}`);
          }
        } catch {
          // Continue without session
        }
      } else {
        saveMessageMutation.mutate({
          sessionId: sid!,
          role: "user",
          content,
        });
      }

      await streamPromise;
    },
    [
      currentSessionId,
      token,
      sendMessage,
      queryClient,
      saveMessageMutation,
    ]
  );

  // Save assistant messages when streaming ends
  const prevStreamingRef = useRef(isStreaming);
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && currentSessionId) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg.content) {
        saveMessageMutation.mutate({
          sessionId: currentSessionId,
          role: "assistant",
          content: lastMsg.content,
        });
      }
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, messages, currentSessionId, saveMessageMutation]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleSend(input);
    },
    [handleSend, input]
  );

  const handleQuestionSubmit = useCallback(
    (formattedAnswers: string) => {
      setPendingQuestions(null);
      handleSend(formattedAnswers);
    },
    [handleSend, setPendingQuestions]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasStreamingRef = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (isStreaming) {
      el.scrollTop = el.scrollHeight;
    }
    wasStreamingRef.current = isStreaming;
  }, [messages, isStreaming, activeTools]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const lastMsg = messages[messages.length - 1];
  const lastMsgIsAssistantWithContent =
    messages.length > 0 &&
    lastMsg?.role === "assistant" &&
    lastMsg?.content.length > 0;

  const isThinking =
    isStreaming &&
    activeTools.length === 0 &&
    !lastMsgIsAssistantWithContent;

  const streamingMsgId =
    isStreaming && lastMsgIsAssistantWithContent ? lastMsg?.id : null;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <FaIcon icon="fa-solid fa-wand-magic-sparkles" className="text-lg text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">
              Business Advisor
            </h1>
            <p className="text-sm text-muted-foreground">
              Ask about your business, request analysis, or generate playbooks
            </p>
          </div>
          <ConvertToBusinessButton
            sessionId={currentSessionId}
            token={token}
            disabled={messages.length === 0 || isStreaming}
            onConverted={() => {}}
          />
          <CopyLogsButton
            threadId={threadId}
            messages={messages}
            debugLogs={debugLogs}
            token={token}
            usedThreadIds={usedThreadIds}
          />
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-6">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-4 py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <FaIcon icon="fa-solid fa-robot" className="text-2xl text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground">
                How can I help you today?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a suggestion below or type your own question
              </p>
            </div>
            <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground shadow-sm transition-colors hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((m) => {
              const isActiveStream = m.id === streamingMsgId;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex animate-message-in",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground",
                      isActiveStream && "streaming-bubble"
                    )}
                  >
                    {m.role === "assistant" ? (
                      <>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                          className="max-w-none text-sm"
                        >
                          {normalizeMarkdown(m.content)}
                        </ReactMarkdown>
                        {isActiveStream && (
                          <span className="streaming-cursor" aria-hidden>▎</span>
                        )}
                      </>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              );
            })}

            {/* Tool activity indicator */}
            {activeTools.length > 0 && (
              <div className="flex animate-slide-up justify-start">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
                  <FaIcon icon="fa-solid fa-screwdriver-wrench fa-pulse" className="text-sm text-primary" />
                  <div className="flex flex-col gap-0.5">
                    {activeTools.map((tool) => (
                      <span
                        key={tool}
                        className="text-sm text-muted-foreground"
                      >
                        {TOOL_LABELS[tool] || tool}...
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Thinking indicator */}
            {isThinking && (
              <div className="flex animate-slide-up justify-start">
                <div className="max-w-[80%] rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-sm shrink-0 text-primary" />
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">
                        Thinking
                      </span>
                      <span className="inline-flex">
                        <span className="animate-pulse text-muted-foreground [animation-delay:0ms]">
                          .
                        </span>
                        <span className="animate-pulse text-muted-foreground [animation-delay:300ms]">
                          .
                        </span>
                        <span className="animate-pulse text-muted-foreground [animation-delay:600ms]">
                          .
                        </span>
                      </span>
                    </div>
                  </div>
                  {thinkingContent && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground/70 italic">
                      {thinkingContent}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="mx-auto max-w-md rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
                <div className="flex items-start gap-3">
                  <FaIcon icon="fa-solid fa-triangle-exclamation" className="mt-0.5 text-sm shrink-0 text-destructive" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">Error</p>
                    <p className="mt-0.5 text-destructive/80">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive question widget */}
            {pendingQuestions && !isStreaming && (
              <div className="flex justify-start">
                <QuestionWidget
                  questions={pendingQuestions}
                  onSubmit={handleQuestionSubmit}
                />
              </div>
            )}

            {/* Business preview widget */}
            {pendingBusinessPreview && !isStreaming && (
              <div className="flex justify-start">
                <BusinessPreviewWidget
                  preview={pendingBusinessPreview}
                  sessionId={currentSessionId}
                  token={token}
                  onAccepted={(id) => {
                    setPendingBusinessPreview(null);
                    queryClient.invalidateQueries({ queryKey: ["businesses"] });
                    navigate(`/business/${id}`);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="relative shrink-0 bg-card/50 px-4 py-4">
        <div className="pointer-events-none absolute inset-x-0 bottom-full h-12 bg-linear-to-t from-background/80 to-transparent" />
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your business..."
              disabled={isStreaming}
              className="flex-1 rounded-xl border border-muted-foreground/30 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={stop}
                className="h-10 w-10 shrink-0 rounded-xl"
              >
                <FaIcon icon="fa-solid fa-stop" className="text-sm" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                className="h-10 w-10 shrink-0 rounded-xl"
              >
                <FaIcon icon="fa-solid fa-arrow-up" className="text-sm" />
              </Button>
            )}
          </div>
          <div className="flex items-center">
            <Select
              value={model}
              onChange={setModel}
              options={MODEL_OPTIONS}
              disabled={isStreaming}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
