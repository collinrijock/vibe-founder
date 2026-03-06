import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaIcon } from "@/components/ui/fa-icon";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { BusinessChatDrawer } from "@/components/BusinessChatDrawer";
import type { BusinessEntity, BusinessPlanEntity, Action, TodoEntity } from "@vibe-founder/shared";
import { ASPECT_DEFINITIONS } from "@vibe-founder/shared";

const ASPECT_ICONS: Record<string, string> = {
  "product-service": "fa-solid fa-box-open",
  "customers-distribution": "fa-solid fa-users",
  "business-model": "fa-solid fa-hand-holding-dollar",
  operations: "fa-solid fa-gears",
  "people-organization": "fa-solid fa-user-tie",
  "mission-principles-culture": "fa-solid fa-compass",
  "finance-capital": "fa-solid fa-chart-line",
};

const TAB_LABELS: Record<string, string> = {
  "product-service": "Product / Service",
  "customers-distribution": "Customers & Distribution",
  "business-model": "Business Model",
  operations: "Operations",
  "people-organization": "People & Org",
  "mission-principles-culture": "Mission & Culture",
  "finance-capital": "Finance & Capital",
};

const mdComponents: Components = {
  h1: ({ children }) => <h1 className="mb-3 mt-5 text-lg font-bold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5 text-sm text-muted-foreground marker:text-muted-foreground/50">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5 text-sm text-muted-foreground marker:text-muted-foreground/50">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">{children}</blockquote>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-4 border-border" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">{children}</a>
  ),
  code: ({ children, className }) => {
    if (className?.startsWith("language-")) {
      return <pre className="my-2 overflow-x-auto rounded-md bg-muted p-3 text-xs"><code>{children}</code></pre>;
    }
    return <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>;
  },
  pre: ({ children }) => <>{children}</>,
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function PlanCard({ plan }: { plan: BusinessPlanEntity }) {
  const [expanded, setExpanded] = useState(false);
  const icon = ASPECT_ICONS[plan.aspectSlug] ?? "fa-solid fa-box-open";
  const actions = (plan.actions || []) as Action[];

  return (
    <Card className={cn("flex flex-col transition-colors duration-200", "hover:border-primary/50")}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FaIcon icon={icon} className="text-lg" />
            </div>
            <div>
              <CardTitle className="text-base">{plan.title}</CardTitle>
              {plan.summary && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{plan.summary}</p>
              )}
            </div>
          </div>
          <Badge variant={actions.length > 0 ? "default" : "secondary"} className="shrink-0">
            {actions.length > 0
              ? `${actions.length} action${actions.length !== 1 ? "s" : ""}`
              : "No actions"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {expanded ? (
          <div className="space-y-4">
            {actions.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</h4>
                <div className="space-y-1.5">
                  {actions.map((action, i) => (
                    <div key={action.id || i} className="flex items-start gap-2 rounded-md border border-border p-2">
                      <Badge
                        variant={action.priority === "high" ? "destructive" : action.priority === "medium" ? "default" : "secondary"}
                        className="shrink-0 text-[10px]"
                      >
                        {action.priority}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{action.title}</p>
                        {action.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {plan.rawMarkdown && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h4>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {plan.rawMarkdown}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ) : (
          <div className="line-clamp-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {plan.rawMarkdown.length > 300 ? plan.rawMarkdown.slice(0, 300) + "..." : plan.rawMarkdown}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>

      <Separator />

      <CardFooter className="pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>Collapse <FaIcon icon="fa-solid fa-chevron-up" className="text-sm" /></>
          ) : (
            <>View Details <FaIcon icon="fa-solid fa-chevron-down" className="text-sm" /></>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function TodoList({
  todos,
  businessId,
  token,
}: {
  todos: TodoEntity[];
  businessId: string;
  token: string;
}) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async ({ todoId, newStatus }: { todoId: string; newStatus: string }) => {
      const res = await fetch(`/api/businesses/${businessId}/todos/${todoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update todo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business", businessId] });
    },
  });

  const sorted = [...todos].sort((a, b) => {
    if (a.status !== b.status) return a.status === "done" ? 1 : -1;
    return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
  });

  const doneCount = todos.filter((t) => t.status === "done").length;
  const progress = todos.length > 0 ? Math.round((doneCount / todos.length) * 100) : 0;

  const grouped = ASPECT_DEFINITIONS.reduce<Record<string, TodoEntity[]>>((acc, aspect) => {
    const aspectTodos = sorted.filter((t) => t.aspectSlug === aspect.slug);
    if (aspectTodos.length > 0) acc[aspect.slug] = aspectTodos;
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FaIcon icon="fa-solid fa-list-check" className="text-lg" />
            </div>
            <div>
              <CardTitle className="text-base">Action Items</CardTitle>
              <p className="text-xs text-muted-foreground">
                {doneCount} of {todos.length} completed
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold text-primary">{progress}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {Object.entries(grouped).map(([slug, aspectTodos]) => {
          const def = ASPECT_DEFINITIONS.find((a) => a.slug === slug);
          return (
            <div key={slug}>
              <div className="mb-2 flex items-center gap-2">
                <FaIcon icon={ASPECT_ICONS[slug] ?? "fa-solid fa-box-open"} className="text-xs text-muted-foreground" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {def?.title ?? slug}
                </h4>
              </div>
              <div className="space-y-1">
                {aspectTodos.map((todo) => (
                  <button
                    key={todo.id}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-md border border-border p-2.5 text-left transition-colors hover:bg-muted/50",
                      todo.status === "done" && "opacity-60"
                    )}
                    onClick={() =>
                      toggleMutation.mutate({
                        todoId: todo.id,
                        newStatus: todo.status === "done" ? "pending" : "done",
                      })
                    }
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        todo.status === "done"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground"
                      )}
                    >
                      {todo.status === "done" && <FaIcon icon="fa-solid fa-check" className="text-[9px]" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-medium", todo.status === "done" && "line-through")}>
                        {todo.title}
                      </p>
                      {todo.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{todo.description}</p>
                      )}
                    </div>
                    <Badge
                      variant={todo.priority === "high" ? "destructive" : todo.priority === "medium" ? "default" : "secondary"}
                      className="shrink-0 text-[10px]"
                    >
                      {todo.priority}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function UpdateWindow({
  businessId,
  token,
}: {
  businessId: string;
  token: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [changeSummary, setChangeSummary] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    const ta = inputRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (!changeSummary) return;
    const t = setTimeout(() => setChangeSummary(null), 6000);
    return () => clearTimeout(t);
  }, [changeSummary]);

  const updateMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`/api/businesses/${businessId}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to process update");
      }
      return res.json() as Promise<{ changeSummary: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["business", businessId] });
      setInput("");
      setOpen(false);
      setChangeSummary(data.changeSummary);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || updateMutation.isPending) return;
    updateMutation.mutate(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/30"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FaIcon icon="fa-solid fa-pen-to-square" className="text-sm" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Post an update</p>
            <p className="text-xs text-muted-foreground">
              Share what changed and your business plan will update automatically
            </p>
          </div>
          <FaIcon icon="fa-solid fa-chevron-right" className="text-xs text-muted-foreground" />
        </button>
        {changeSummary && (
          <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <FaIcon icon="fa-solid fa-circle-check" className="mt-0.5 text-sm text-primary" />
            <p className="text-xs text-foreground">{changeSummary}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={cn(
          "relative rounded-2xl border bg-card shadow-sm transition-all",
          updateMutation.isPending
            ? "border-primary/40 shadow-md ring-1 ring-primary/20"
            : "border-border focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring"
        )}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='e.g. "We landed our first paying customer" or "Switching from subscriptions to per-order pricing"'
          disabled={updateMutation.isPending}
          rows={1}
          className="w-full resize-none rounded-2xl bg-transparent px-5 pb-14 pt-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {!updateMutation.isPending && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setOpen(false); setInput(""); updateMutation.reset(); }}
              className="h-8 text-xs text-muted-foreground"
            >
              Cancel
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {updateMutation.isPending ? "Analyzing..." : "Enter to send"}
          </span>
          <Button
            type="submit"
            size="icon"
            disabled={updateMutation.isPending || !input.trim()}
            className="h-8 w-8 rounded-xl"
          >
            {updateMutation.isPending ? (
              <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-sm" />
            ) : (
              <FaIcon icon="fa-solid fa-arrow-up" className="text-sm" />
            )}
          </Button>
        </div>
      </div>
      {updateMutation.isError && (
        <p className="mt-2 text-center text-sm text-destructive">
          {updateMutation.error instanceof Error ? updateMutation.error.message : "Something went wrong"}
        </p>
      )}
    </form>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="pt-4">
        <Skeleton className="ml-auto h-8 w-28 rounded-md" />
      </CardFooter>
    </Card>
  );
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border p-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <FaIcon icon={icon} className="text-xs" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="text-xs text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function BusinessDashboardPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const { token } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);

  const {
    data: business,
    isLoading,
    error,
    refetch,
  } = useQuery<BusinessEntity>({
    queryKey: ["business", businessId],
    queryFn: async () => {
      const res = await fetch(`/api/businesses/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load business (${res.status})`);
      const data = await res.json();
      return data.business;
    },
    enabled: !!businessId && !!token,
  });

  const errorMessage =
    error instanceof Error ? error.message : error ? "Something went wrong" : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {isLoading ? (
        <>
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </>
      ) : errorMessage ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0 gap-1.5">
              <FaIcon icon="fa-solid fa-rotate-right" className="text-sm" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : business ? (
        <>
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-14 items-center justify-center rounded-xl bg-primary/10">
                <FaIcon icon="fa-solid fa-building" className="text-xl text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{business.name}</h1>
                {business.description && (
                  <p className="text-sm text-muted-foreground">{business.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem icon="fa-solid fa-industry" label="Industry" value={business.industry} />
            <InfoItem icon="fa-solid fa-bullseye" label="Target Customer" value={business.targetCustomer} />
            <InfoItem icon="fa-solid fa-lightbulb" label="Value Proposition" value={business.valueProposition} />
            <InfoItem icon="fa-solid fa-sack-dollar" label="Revenue Model" value={business.revenueModel} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <UpdateWindow businessId={business.id} token={token!} />
            <button
              onClick={() => setChatOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FaIcon icon="fa-solid fa-comments" className="text-sm" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Start a chat</p>
                <p className="text-xs text-muted-foreground">
                  Ask questions, explore strategies, and get AI advice
                </p>
              </div>
              <FaIcon icon="fa-solid fa-chevron-right" className="text-xs text-muted-foreground" />
            </button>
          </div>

          <BusinessChatDrawer
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            business={business}
            token={token!}
          />

          {business.plans.length > 0 ? (
            <Tabs defaultValue={business.plans[0]?.aspectSlug ?? ""} className="space-y-4">
              <TabsList className="flex w-full gap-1 h-auto p-1.5">
                {ASPECT_DEFINITIONS.map((aspect) => {
                  const hasPlan = business.plans.some((p) => p.aspectSlug === aspect.slug);
                  return (
                    <TabsTrigger
                      key={aspect.slug}
                      value={aspect.slug}
                      disabled={!hasPlan}
                      className="gap-1.5 text-xs whitespace-nowrap"
                    >
                      <FaIcon icon={ASPECT_ICONS[aspect.slug] ?? "fa-solid fa-box-open"} className="text-xs" />
                      {TAB_LABELS[aspect.slug] ?? aspect.title}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {business.plans.map((plan) => (
                <TabsContent key={plan.id} value={plan.aspectSlug}>
                  <PlanCard plan={plan} />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <FaIcon icon="fa-solid fa-building" className="mx-auto text-2xl text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">No plans extracted yet</p>
              </CardContent>
            </Card>
          )}

          {business.todos && business.todos.length > 0 && (
            <TodoList todos={business.todos} businessId={business.id} token={token!} />
          )}
        </>
      ) : null}
    </div>
  );
}
