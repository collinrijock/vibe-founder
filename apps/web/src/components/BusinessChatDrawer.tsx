import { useRef, useEffect, useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCopilot, type CopilotMessage } from "@/hooks/useCopilot";
import { QuestionWidget } from "@/components/QuestionWidget";
import type { BusinessEntity } from "@vibe-founder/shared";

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

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mb-3 mt-5 text-base font-bold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-sm font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5 marker:text-muted-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5 marker:text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-primary/50 pl-3 text-muted-foreground italic">{children}</blockquote>,
  hr: () => <hr className="my-4 border-border" />,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">{children}</a>,
  table: ({ children }) => <div className="my-2 overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm">{children}</table></div>,
  thead: ({ children }) => <thead className="border-b border-border bg-muted/50">{children}</thead>,
  th: ({ children }) => <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground">{children}</th>,
  td: ({ children }) => <td className="border-t border-border px-2 py-1.5">{children}</td>,
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-") || (typeof children === "string" && children.includes("\n"));
    if (isBlock) {
      return <pre className="my-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-xs leading-relaxed"><code className={className}>{children}</code></pre>;
    }
    return <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{children}</code>;
  },
  pre: ({ children }) => <>{children}</>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
};

function normalizeMarkdown(content: string): string {
  return content.replace(/^(\s*)\[( |x)\] /gm, "$1- [$2] ");
}

function buildBusinessContext(b: BusinessEntity): string {
  const lines: string[] = [
    `[BUSINESS CONTEXT — The user is chatting from the dashboard of their business. All questions are about THIS business. Do NOT use convertToBusiness or askFounderQuestions onboarding flows — this business already exists.]`,
    `Business: ${b.name}`,
    `Description: ${b.description}`,
    `Industry: ${b.industry}`,
    `Target Customer: ${b.targetCustomer}`,
    `Value Proposition: ${b.valueProposition}`,
    `Revenue Model: ${b.revenueModel}`,
    `Stage: ${b.stage}`,
  ];

  if (b.plans.length > 0) {
    lines.push("", "--- Current Plans ---");
    for (const plan of b.plans) {
      lines.push(`\n## ${plan.title} (${plan.aspectSlug})`);
      if (plan.summary) lines.push(plan.summary);
      const actions = (plan.actions || []) as { title: string; priority?: string; description?: string }[];
      if (actions.length > 0) {
        lines.push("Actions:");
        for (const a of actions) {
          lines.push(`- [${a.priority || "medium"}] ${a.title}${a.description ? ": " + a.description : ""}`);
        }
      }
    }
  }

  if (b.todos.length > 0) {
    lines.push("", "--- Todos ---");
    for (const t of b.todos) {
      lines.push(`- [${t.status}] (${t.priority}) ${t.title}${t.aspectSlug ? " (" + t.aspectSlug + ")" : ""}`);
    }
  }

  return lines.join("\n");
}

interface BusinessChatDrawerProps {
  open: boolean;
  onClose: () => void;
  business: BusinessEntity;
  token: string;
}

export function BusinessChatDrawer({
  open,
  onClose,
  business,
  token,
}: BusinessChatDrawerProps) {
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [threadId] = useState(() => `biz_${business.id}_${Date.now()}`);
  const contextSentRef = useRef(false);

  const {
    messages,
    sendMessage,
    isStreaming,
    activeTools,
    thinkingContent,
    error,
    pendingQuestions,
    setPendingQuestions,
    stop,
  } = useCopilot({ threadId, token, model: "claude-sonnet-4-6" });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && isStreaming) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isStreaming, activeTools]);

  const saveMessageMutation = useMutation({
    mutationFn: async ({ sid, role, content }: { sid: string; role: string; content: string }) => {
      await fetch(`/api/sessions/${sid}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role, content }),
      });
    },
  });

  const handleSend = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isStreaming) return;
      setInput("");

      let messageForAI = content;
      if (!contextSentRef.current) {
        contextSentRef.current = true;
        const ctx = buildBusinessContext(business);
        messageForAI = `${ctx}\n\n---\n\nUser question: ${content}`;
      }

      const streamPromise = sendMessage(messageForAI, content);

      let sid = sessionId;
      if (!sid) {
        try {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ firstMessage: `[Business: ${business.name}] ${content}` }),
          });
          if (res.ok) {
            const data = await res.json();
            sid = data.session.id;
            setSessionId(sid);
          }
        } catch { /* continue without session */ }
      } else {
        saveMessageMutation.mutate({ sid, role: "user", content });
      }

      await streamPromise;
    },
    [sessionId, token, business, sendMessage, isStreaming, saveMessageMutation]
  );

  const prevStreamingRef = useRef(isStreaming);
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && sessionId) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg.content) {
        saveMessageMutation.mutate({ sid: sessionId, role: "assistant", content: lastMsg.content });
      }
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, messages, sessionId, saveMessageMutation]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
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

  const lastMsg = messages[messages.length - 1];
  const lastMsgIsAssistantWithContent = messages.length > 0 && lastMsg?.role === "assistant" && lastMsg?.content.length > 0;
  const isThinking = isStreaming && activeTools.length === 0 && !lastMsgIsAssistantWithContent;
  const streamingMsgId = isStreaming && lastMsgIsAssistantWithContent ? lastMsg?.id : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <FaIcon icon="fa-solid fa-comments" className="text-base text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">Chat about {business.name}</h2>
            <p className="text-xs text-muted-foreground">Ask questions, get advice, explore strategies</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <FaIcon icon="fa-solid fa-xmark" className="text-sm" />
          </button>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <FaIcon icon="fa-solid fa-robot" className="text-xl text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">Chat with your business advisor</h3>
                <p className="mt-1 text-xs text-muted-foreground">Ask about strategy, next steps, or anything about {business.name}</p>
              </div>
              <div className="grid w-full max-w-sm gap-2">
                {[
                  "What should I focus on next?",
                  "How can I acquire my first customers?",
                  "What are the biggest risks?",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-secondary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
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
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
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

              {/* Tool activity */}
              {activeTools.length > 0 && (
                <div className="flex animate-slide-up justify-start">
                  <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-sm">
                    <FaIcon icon="fa-solid fa-screwdriver-wrench fa-pulse" className="text-xs text-primary" />
                    <div className="flex flex-col gap-0.5">
                      {activeTools.map((tool) => (
                        <span key={tool} className="text-xs text-muted-foreground">
                          {TOOL_LABELS[tool] || tool}...
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Thinking */}
              {isThinking && (
                <div className="flex animate-slide-up justify-start">
                  <div className="max-w-[85%] rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-xs shrink-0 text-primary" />
                      <span className="text-xs text-muted-foreground">Thinking</span>
                      <span className="inline-flex">
                        <span className="animate-pulse text-muted-foreground [animation-delay:0ms]">.</span>
                        <span className="animate-pulse text-muted-foreground [animation-delay:300ms]">.</span>
                        <span className="animate-pulse text-muted-foreground [animation-delay:600ms]">.</span>
                      </span>
                    </div>
                    {thinkingContent && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/70 italic">{thinkingContent}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <FaIcon icon="fa-solid fa-triangle-exclamation" className="mt-0.5 shrink-0 text-xs text-destructive" />
                    <p className="text-destructive/80">{error}</p>
                  </div>
                </div>
              )}

              {/* Questions widget */}
              {pendingQuestions && !isStreaming && (
                <div className="flex justify-start">
                  <QuestionWidget questions={pendingQuestions} onSubmit={handleQuestionSubmit} />
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="shrink-0 border-t border-border bg-card/50 px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              disabled={isStreaming}
              className="flex-1 rounded-xl border border-muted-foreground/30 bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            {isStreaming ? (
              <Button type="button" size="icon" variant="outline" onClick={stop} className="h-9 w-9 shrink-0 rounded-xl">
                <FaIcon icon="fa-solid fa-stop" className="text-xs" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()} className="h-9 w-9 shrink-0 rounded-xl">
                <FaIcon icon="fa-solid fa-arrow-up" className="text-xs" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
