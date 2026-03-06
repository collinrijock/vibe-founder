import { useState } from "react";
import { cn } from "@/lib/utils";
import { FaIcon } from "@/components/ui/fa-icon";
import { useWorkspace } from "@/lib/workspace";
import { useAgentRuns } from "@/hooks/useAgentRuns";
import { useApprovals, type PendingApproval } from "@/hooks/useApprovals";
import { AGENT_CATALOG } from "@vibe-founder/shared";
import type { AgentRunEntity } from "@vibe-founder/shared";

function getAgentName(agentId: string): string {
  return AGENT_CATALOG.find((a) => a.id === agentId)?.name ?? agentId;
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function statusColor(status: AgentRunEntity["status"]): string {
  switch (status) {
    case "running":
    case "queued":
      return "bg-green-500 animate-pulse";
    case "completed":
      return "bg-blue-500";
    case "waiting_approval":
      return "bg-orange-500";
    case "failed":
      return "bg-red-500";
    case "cancelled":
      return "bg-zinc-500";
    default:
      return "bg-zinc-600";
  }
}

function statusLabel(status: AgentRunEntity["status"]): string {
  switch (status) {
    case "running":
      return "Running";
    case "queued":
      return "Queued";
    case "completed":
      return "Done";
    case "failed":
      return "Failed";
    case "waiting_approval":
      return "Needs Approval";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function riskLevelColor(level: string): string {
  switch (level) {
    case "write_high":
      return "text-orange-400 bg-orange-500/10";
    case "financial":
      return "text-red-400 bg-red-500/10";
    case "write_low":
      return "text-yellow-400 bg-yellow-500/10";
    default:
      return "text-muted-foreground bg-secondary";
  }
}

function riskLevelLabel(level: string): string {
  switch (level) {
    case "write_high":
      return "High Risk";
    case "financial":
      return "Financial";
    case "write_low":
      return "Low Risk";
    default:
      return level;
  }
}

type AgentBarTab = "runs" | "approvals";

export function AgentBar() {
  const { agentBarExpanded, toggleAgentBar } = useWorkspace();
  const { activeRuns, recentRuns } = useAgentRuns();
  const { pendingApprovals, pendingCount, resolveApproval, resolving } = useApprovals();
  const [activeTab, setActiveTab] = useState<AgentBarTab>("runs");

  const displayRuns = agentBarExpanded ? recentRuns : activeRuns;

  return (
    <div
      className={cn(
        "border-t border-[var(--color-panel-border)] bg-[var(--color-agent-bar-bg)] transition-all",
        agentBarExpanded ? "h-64" : "h-9"
      )}
    >
      <div
        className="flex h-9 items-center gap-2 px-3 cursor-pointer select-none"
        onClick={toggleAgentBar}
      >
        <FaIcon
          icon={agentBarExpanded ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up"}
          className="text-[10px] text-muted-foreground"
        />
        <span className="text-[11px] font-medium text-muted-foreground">Agents</span>

        {activeRuns.length > 0 ? (
          <div className="flex items-center gap-1.5 ml-2">
            {activeRuns.map((run) => (
              <div key={run.id} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", statusColor(run.status))} />
                <span className="text-[10px] text-foreground">{getAgentName(run.agentId)}</span>
              </div>
            ))}
          </div>
        ) : recentRuns.length > 0 ? (
          <span className="text-[10px] text-muted-foreground/50 ml-1">
            {recentRuns.length} recent run{recentRuns.length !== 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/50 ml-1">No active runs</span>
        )}

        {pendingCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("approvals");
              if (!agentBarExpanded) toggleAgentBar();
            }}
            className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 ml-2"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[10px] font-medium text-orange-400">
              {pendingCount} approval{pendingCount !== 1 ? "s" : ""}
            </span>
          </button>
        )}

        <div className="ml-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <FaIcon icon="fa-solid fa-plus" className="text-[9px]" />
            Run Agent
          </button>
        </div>
      </div>

      {agentBarExpanded && (
        <div className="flex flex-col h-[calc(100%-2.25rem)] overflow-hidden">
          <div className="flex items-center gap-0.5 px-3 pb-1">
            <button
              onClick={() => setActiveTab("runs")}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                activeTab === "runs"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Runs
            </button>
            <button
              onClick={() => setActiveTab("approvals")}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors flex items-center gap-1",
                activeTab === "approvals"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Approvals
              {pendingCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-auto px-3 pb-3">
            {activeTab === "runs" ? (
              displayRuns.length === 0 ? (
                <div className="flex h-full items-center justify-center py-12">
                  <div className="text-center">
                    <FaIcon icon="fa-solid fa-robot" className="text-2xl text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No agent runs yet</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      Run an agent from chat or the agent catalog
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mt-1">
                  {displayRuns.map((run) => (
                    <AgentRunCard key={run.id} run={run} />
                  ))}
                </div>
              )
            ) : pendingApprovals.length === 0 ? (
              <div className="flex h-full items-center justify-center py-12">
                <div className="text-center">
                  <FaIcon icon="fa-solid fa-check-circle" className="text-2xl text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No pending approvals</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    High-risk agent actions will appear here for review
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mt-1">
                {pendingApprovals.map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onResolve={resolveApproval}
                    resolving={resolving === approval.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  approval,
  onResolve,
  resolving,
}: {
  approval: PendingApproval;
  onResolve: (id: string, decision: "approved" | "rejected") => Promise<boolean>;
  resolving: boolean;
}) {
  return (
    <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full shrink-0 bg-orange-500 animate-pulse" />
        <span className="text-xs font-medium text-foreground">{approval.action}</span>
        <span className={cn("ml-auto rounded px-1.5 py-0.5 text-[9px] font-medium", riskLevelColor(approval.riskLevel))}>
          {riskLevelLabel(approval.riskLevel)}
        </span>
      </div>

      {approval.description && (
        <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">{approval.description}</p>
      )}

      <div className="mt-1 text-[10px] text-muted-foreground/60">
        <span>{approval.tool}</span>
        {approval.provider && <span> via {approval.provider}</span>}
        <span> &middot; {formatTimeAgo(approval.createdAt)}</span>
      </div>

      {approval.preview && Object.keys(approval.preview).length > 0 && (
        <div className="mt-2 rounded bg-black/20 p-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Preview:</p>
          <div className="space-y-0.5">
            {Object.entries(approval.preview).slice(0, 4).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-[10px]">
                <span className="text-muted-foreground/60 shrink-0">{key}:</span>
                <span className="text-foreground/70 truncate">
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2.5 flex gap-2">
        <button
          onClick={() => onResolve(approval.id, "approved")}
          disabled={resolving}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
            resolving
              ? "bg-secondary text-muted-foreground cursor-wait"
              : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
          )}
        >
          {resolving ? (
            <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-[10px]" />
          ) : (
            <>
              <FaIcon icon="fa-solid fa-check" className="text-[9px] mr-1" />
              Approve
            </>
          )}
        </button>
        <button
          onClick={() => onResolve(approval.id, "rejected")}
          disabled={resolving}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
            resolving
              ? "bg-secondary text-muted-foreground cursor-wait"
              : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
          )}
        >
          <FaIcon icon="fa-solid fa-xmark" className="text-[9px] mr-1" />
          Reject
        </button>
      </div>
    </div>
  );
}

function AgentRunCard({ run }: { run: AgentRunEntity }) {
  const hasOutput = run.status === "completed" && run.output;
  const outputPreview = hasOutput
    ? getOutputPreview(run.output!)
    : run.error
      ? run.error
      : null;

  return (
    <div className="rounded-lg border border-[var(--color-panel-border)] bg-secondary/30 p-3">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full shrink-0", statusColor(run.status))} />
        <span className="text-xs font-medium text-foreground">{getAgentName(run.agentId)}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {statusLabel(run.status)} &middot; {formatTimeAgo(run.startedAt)}
        </span>
      </div>
      {outputPreview && (
        <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">{outputPreview}</p>
      )}
      {hasOutput && run.output && (
        <div className="mt-2 flex gap-1.5">
          {Array.isArray(run.output.competitors) && (
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
              {(run.output.competitors as unknown[]).length} competitors
            </span>
          )}
          {Array.isArray(run.output.leads) && (
            <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400">
              {(run.output.leads as unknown[]).length} leads
            </span>
          )}
          {typeof run.output.contentType === "string" && (
            <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400">
              {run.output.contentType}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function getOutputPreview(output: Record<string, unknown>): string {
  if (typeof output.summary === "string") return output.summary;
  if (typeof output.title === "string") return output.title;
  if (typeof output.rawContent === "string") return output.rawContent.slice(0, 120);
  return "Results available";
}
