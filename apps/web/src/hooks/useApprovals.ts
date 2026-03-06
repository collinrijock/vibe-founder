import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";

export interface PendingApproval {
  id: string;
  userId: string;
  businessId: string;
  agentRunId: string;
  tool: string;
  provider: string;
  action: string;
  description: string;
  riskLevel: "read" | "write_low" | "write_high" | "financial";
  preview: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: string;
  resolvedAt: string | null;
}

interface UseApprovalsReturn {
  pendingApprovals: PendingApproval[];
  allApprovals: PendingApproval[];
  pendingCount: number;
  loading: boolean;
  resolving: string | null;
  fetchPending: () => Promise<void>;
  fetchAll: () => Promise<void>;
  resolveApproval: (
    approvalId: string,
    decision: "approved" | "rejected",
    editedPayload?: Record<string, unknown>
  ) => Promise<boolean>;
}

export function useApprovals(): UseApprovalsReturn {
  const { token } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [allApprovals, setAllApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/approvals/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingApprovals(data.approvals ?? []);
      }
    } catch {
      // silently fail
    }
  }, [token]);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/approvals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllApprovals(data.approvals ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 10_000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const resolveApproval = useCallback(
    async (
      approvalId: string,
      decision: "approved" | "rejected",
      editedPayload?: Record<string, unknown>
    ): Promise<boolean> => {
      if (!token) return false;
      setResolving(approvalId);
      try {
        const res = await fetch(`/api/approvals/${approvalId}/resolve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ approvalId, decision, editedPayload }),
        });

        if (res.ok) {
          setPendingApprovals((prev) =>
            prev.filter((a) => a.id !== approvalId)
          );
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setResolving(null);
      }
    },
    [token]
  );

  return {
    pendingApprovals,
    allApprovals,
    pendingCount: pendingApprovals.length,
    loading,
    resolving,
    fetchPending,
    fetchAll,
    resolveApproval,
  };
}
