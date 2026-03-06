import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaIcon } from "@/components/ui/fa-icon";
import { useAuth } from "@/lib/auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAgentRuns } from "@/hooks/useAgentRuns";
import { useWorkspace } from "@/lib/workspace";
import type { AgentDefinition } from "@vibe-founder/shared";

export function AgentsSidebar() {
  const { token } = useAuth();
  const { triggerAgent, activeRuns } = useAgentRuns();
  const { setAgentBarExpanded } = useWorkspace();
  const [runningId, setRunningId] = useState<string | null>(null);

  const { data: agents = [] } = useQuery<AgentDefinition[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await fetch("/api/agents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.agents;
    },
    enabled: !!token,
  });

  const { data: businesses = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["businesses-list"],
    queryFn: async () => {
      const res = await fetch("/api/businesses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.businesses ?? []).map((b: { id: string; name: string }) => ({
        id: b.id,
        name: b.name,
      }));
    },
    enabled: !!token,
  });

  const handleRun = async (agent: AgentDefinition) => {
    if (!agent.available || runningId === agent.id) return;
    if (businesses.length === 0) return;

    const targetBusiness = businesses[0];
    setRunningId(agent.id);
    setAgentBarExpanded(true);

    await triggerAgent(agent.id, targetBusiness.id);
    setRunningId(null);
  };

  const isAgentRunning = (agentId: string) =>
    activeRuns.some((r) => r.agentId === agentId) || runningId === agentId;

  const available = agents.filter((a) => a.available);
  const unavailable = agents.filter((a) => !a.available);

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agents</h3>
      </div>
      <ScrollArea className="flex-1 px-3">
        {available.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1.5 px-2">
              Available
            </p>
            <div className="space-y-0.5">
              {available.map((agent) => (
                <div
                  key={agent.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground cursor-pointer hover:bg-secondary/50"
                  onClick={() => handleRun(agent)}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      isAgentRunning(agent.id) ? "bg-green-500 animate-pulse" : "bg-green-500"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{agent.name}</span>
                    <span className="text-[10px] text-muted-foreground/60 truncate block">
                      {agent.description.slice(0, 60)}...
                    </span>
                  </div>
                  {isAgentRunning(agent.id) ? (
                    <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-[10px] text-green-500" />
                  ) : (
                    <FaIcon
                      icon="fa-solid fa-play"
                      className="text-[9px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {unavailable.length > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1.5 px-2">
              Coming Soon
            </p>
            <div className="space-y-0.5">
              {unavailable.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground/50"
                >
                  <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-zinc-600" />
                  <span className="truncate">{agent.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground/40">Soon</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
