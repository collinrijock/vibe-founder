import { useQuery } from "@tanstack/react-query";
import { FaIcon } from "@/components/ui/fa-icon";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  description: string;
  type: "one-shot" | "scheduled" | "always-on";
  provider: string;
  available: boolean;
}

const TYPE_CONFIG: Record<
  Agent["type"],
  { label: string; className: string; icon: string }
> = {
  "one-shot": {
    label: "One-Shot",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    icon: "fa-solid fa-bolt",
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: "fa-regular fa-clock",
  },
  "always-on": {
    label: "Always On",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: "fa-solid fa-rocket",
  },
};

function AgentCard({ agent }: { agent: Agent }) {
  const typeConfig = TYPE_CONFIG[agent.type];

  return (
    <Card
      className={cn(
        "flex flex-col transition-colors duration-200",
        "hover:border-primary/50",
        !agent.available && "opacity-75"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FaIcon icon="fa-solid fa-robot" className="text-lg" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">{agent.name}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {agent.description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={typeConfig.className}>
            <FaIcon icon={typeConfig.icon} className="mr-1 text-[10px]" />
            {typeConfig.label}
          </Badge>
          <Badge variant="secondary">{agent.provider}</Badge>
          {agent.available ? (
            <Badge
              variant="outline"
              className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            >
              Available
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Coming Soon
            </Badge>
          )}
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="pt-4">
        {agent.available ? (
          <Button size="sm" className="ml-auto">
            <FaIcon icon="fa-solid fa-rocket" className="mr-1.5 text-sm" />
            Deploy
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            disabled
          >
            Coming Soon
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-18 rounded-md" />
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="pt-4">
        <Skeleton className="ml-auto h-8 w-24 rounded-md" />
      </CardFooter>
    </Card>
  );
}

async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch("/api/agents");
  if (!res.ok) throw new Error(`Failed to fetch agents (${res.status})`);
  return res.json();
}

export default function AgentPage() {
  const {
    data: agents = [],
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });

  const errorMessage =
    error instanceof Error ? error.message : error ? "Something went wrong" : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Agents
        </h1>
        <p className="text-muted-foreground">
          Automated agents to help run your business
        </p>
      </div>

      {errorMessage && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="shrink-0 gap-1.5"
            >
              <FaIcon icon="fa-solid fa-rotate-right" className="text-sm" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
      </div>
    </div>
  );
}
