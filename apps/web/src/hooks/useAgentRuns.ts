import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import type {
  AgentRunEntity,
  AgentBarSSEEvent,
} from "@vibe-founder/shared";

interface UseAgentRunsOptions {
  businessId?: string;
}

export function useAgentRuns({ businessId }: UseAgentRunsOptions = {}) {
  const { token } = useAuth();
  const [runs, setRuns] = useState<AgentRunEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchRuns = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const qs = businessId ? `?businessId=${businessId}` : "";
      const res = await fetch(`/api/agents/runs${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [token, businessId]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    if (!token) return;

    const es = new EventSource(`/api/agents/events?token=${token}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: AgentBarSSEEvent & { type: string } = JSON.parse(e.data);
        handleSSEEvent(event);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        if (eventSourceRef.current === es) {
          const newEs = new EventSource(`/api/agents/events?token=${token}`);
          eventSourceRef.current = newEs;
          newEs.onmessage = es.onmessage;
          newEs.onerror = es.onerror;
        }
      }, 5000);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [token]);

  const handleSSEEvent = useCallback((event: AgentBarSSEEvent & { type: string }) => {
    switch (event.type) {
      case "run_started": {
        if ("run" in event) {
          setRuns((prev) => [event.run, ...prev]);
        }
        break;
      }
      case "run_progress": {
        if ("runId" in event && "message" in event) {
          setRuns((prev) =>
            prev.map((r) =>
              r.id === event.runId
                ? { ...r, status: "running" as const }
                : r
            )
          );
        }
        break;
      }
      case "run_completed": {
        if ("runId" in event) {
          setRuns((prev) =>
            prev.map((r) =>
              r.id === event.runId
                ? {
                    ...r,
                    status: "completed" as const,
                    output: "output" in event ? event.output : null,
                    completedAt: new Date().toISOString(),
                  }
                : r
            )
          );
        }
        break;
      }
      case "run_failed": {
        if ("runId" in event) {
          setRuns((prev) =>
            prev.map((r) =>
              r.id === event.runId
                ? {
                    ...r,
                    status: "failed" as const,
                    error: "error" in event ? event.error : "Unknown error",
                    completedAt: new Date().toISOString(),
                  }
                : r
            )
          );
        }
        break;
      }
    }
  }, []);

  const triggerAgent = useCallback(
    async (
      agentId: string,
      targetBusinessId: string,
      parameters?: Record<string, unknown>
    ) => {
      if (!token) return null;
      try {
        const res = await fetch(`/api/agents/${agentId}/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            businessId: targetBusinessId,
            parameters: parameters ?? {},
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed" }));
          throw new Error(err.error);
        }

        const reader = res.body?.getReader();
        if (!reader) return null;

        const decoder = new TextDecoder();
        let buffer = "";
        let lastRun: AgentRunEntity | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              handleSSEEvent(event);
              if (event.type === "done" && event.run) {
                lastRun = event.run;
              }
            } catch {
              // skip
            }
          }
        }

        await fetchRuns();
        return lastRun;
      } catch {
        return null;
      }
    },
    [token, handleSSEEvent, fetchRuns]
  );

  const activeRuns = runs.filter(
    (r) => r.status === "running" || r.status === "queued"
  );

  const recentRuns = runs.slice(0, 20);

  return {
    runs,
    activeRuns,
    recentRuns,
    loading,
    fetchRuns,
    triggerAgent,
  };
}
