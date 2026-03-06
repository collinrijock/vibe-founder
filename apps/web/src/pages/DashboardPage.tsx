import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { cn } from "@/lib/utils";

interface Aspect {
  slug: string;
  title: string;
  summary: string;
  actions: string[];
  systems: string[];
  rawMarkdown: string;
}

const ASPECT_ICONS: Record<string, string> = {
  "product-service": "fa-solid fa-box-open",
  "customers-distribution": "fa-solid fa-users",
  "business-model": "fa-solid fa-hand-holding-dollar",
  operations: "fa-solid fa-gears",
  "people-organization": "fa-solid fa-user-tie",
  "mission-principles-culture": "fa-solid fa-compass",
  "finance-capital": "fa-solid fa-chart-line",
};

function AspectCard({ aspect }: { aspect: Aspect }) {
  const [expanded, setExpanded] = useState(false);
  const icon = ASPECT_ICONS[aspect.slug] ?? "fa-solid fa-box-open";

  const preview =
    aspect.rawMarkdown.length > 150
      ? aspect.rawMarkdown.slice(0, 150) + "..."
      : aspect.rawMarkdown;

  return (
    <Card
      className={cn(
        "flex flex-col transition-colors duration-200",
        "hover:border-primary/50"
      )}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FaIcon icon={icon} className="text-lg" />
            </div>
            <CardTitle className="text-base">{aspect.title}</CardTitle>
          </div>
          <Badge
            variant={aspect.actions.length > 0 ? "default" : "secondary"}
            className="shrink-0"
          >
            {aspect.actions.length > 0
              ? `${aspect.actions.length} action${aspect.actions.length !== 1 ? "s" : ""}`
              : "No actions yet"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {expanded ? aspect.rawMarkdown : preview}
        </p>
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
            <>
              Collapse <FaIcon icon="fa-solid fa-chevron-up" className="text-sm" />
            </>
          ) : (
            <>
              View Details <FaIcon icon="fa-solid fa-chevron-down" className="text-sm" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
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

async function fetchAspects(): Promise<Aspect[]> {
  const res = await fetch("/api/aspects");
  if (!res.ok) throw new Error(`Failed to fetch aspects (${res.status})`);
  return res.json();
}

export default function DashboardPage() {
  const {
    data: aspects = [],
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: ["aspects"], queryFn: fetchAspects });

  const errorMessage =
    error instanceof Error ? error.message : error ? "Something went wrong" : null;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Business Overview
        </h1>
        <p className="text-muted-foreground">
          Your 7 business aspects at a glance
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

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
          : aspects.map((aspect) => (
              <AspectCard key={aspect.slug} aspect={aspect} />
            ))}
      </div>
    </div>
  );
}
