import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";

export interface SupportedProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  appName: string;
}

export interface ConnectionRecord {
  id: string;
  userId: string;
  provider: string;
  accountLabel: string;
  status: "active" | "expired" | "revoked";
  composioConnectionId: string;
  lastUsedAt: string | null;
  connectedAt: string;
  providerInfo?: SupportedProvider;
}

interface UseConnectionsReturn {
  connections: ConnectionRecord[];
  providers: SupportedProvider[];
  composioConfigured: boolean;
  loading: boolean;
  connecting: string | null;
  fetchConnections: () => Promise<void>;
  initiateConnection: (providerId: string) => Promise<void>;
  disconnectConnection: (connectionId: string) => Promise<void>;
  syncConnections: () => Promise<void>;
}

export function useConnections(): UseConnectionsReturn {
  const { token } = useAuth();
  const [connections, setConnections] = useState<ConnectionRecord[]>([]);
  const [providers, setProviders] = useState<SupportedProvider[]>([]);
  const [composioConfigured, setComposioConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/connections/providers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers ?? []);
        setComposioConfigured(data.composioConfigured ?? false);
      }
    } catch {
      // silently fail
    }
  }, [token]);

  const fetchConnections = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/connections", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const conns: ConnectionRecord[] = (data.connections ?? []).map(
          (c: ConnectionRecord) => ({
            ...c,
            providerInfo: providers.find(
              (p) => p.id === c.provider || p.appName === c.provider
            ),
          })
        );
        setConnections(conns);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [token, providers]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    if (providers.length > 0) {
      fetchConnections();
    }
  }, [fetchConnections, providers.length]);

  const initiateConnection = useCallback(
    async (providerId: string) => {
      if (!token) return;
      setConnecting(providerId);
      try {
        const redirectUrl = `${window.location.origin}/connections/callback?provider=${providerId}`;
        const res = await fetch("/api/connections/initiate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ provider: providerId, redirectUrl }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authUrl) {
            window.open(data.authUrl, "_blank", "width=600,height=700");
          }
        } else {
          const err = await res.json().catch(() => ({}));
          if (err.error?.includes("not yet configured")) {
            await simulateConnection(providerId);
          }
        }
      } catch {
        await simulateConnection(providerId);
      } finally {
        setConnecting(null);
      }
    },
    [token]
  );

  const simulateConnection = useCallback(
    async (providerId: string) => {
      if (!token) return;
      try {
        const res = await fetch("/api/connections/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ provider: providerId }),
        });
        if (res.ok) {
          await fetchConnections();
        }
      } catch {
        // silently fail
      }
    },
    [token, fetchConnections]
  );

  const disconnectConnection = useCallback(
    async (connectionId: string) => {
      if (!token) return;
      try {
        const res = await fetch(`/api/connections/${connectionId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setConnections((prev) =>
            prev.map((c) =>
              c.id === connectionId ? { ...c, status: "revoked" as const } : c
            )
          );
        }
      } catch {
        // silently fail
      }
    },
    [token]
  );

  const syncConnections = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/connections/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchConnections();
      }
    } catch {
      // silently fail
    }
  }, [token, fetchConnections]);

  return {
    connections,
    providers,
    composioConfigured,
    loading,
    connecting,
    fetchConnections,
    initiateConnection,
    disconnectConnection,
    syncConnections,
  };
}
