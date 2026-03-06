import { FaIcon } from "@/components/ui/fa-icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useConnections, type SupportedProvider } from "@/hooks/useConnections";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProviderCard({
  provider,
  connected,
  connectionId,
  connectedAt,
  isConnecting,
  onConnect,
  onDisconnect,
}: {
  provider: SupportedProvider;
  connected: boolean;
  connectionId?: string;
  connectedAt?: string;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        connected
          ? "border-green-500/30 bg-green-500/5"
          : "border-[var(--color-panel-border)] bg-secondary/20 hover:bg-secondary/40"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            connected ? "bg-green-500/10 text-green-400" : "bg-secondary text-muted-foreground"
          )}
        >
          <FaIcon icon={provider.icon} className="text-sm" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">{provider.name}</span>
            {connected && (
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
            {provider.description}
          </p>
          {connected && connectedAt && (
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Connected {formatDate(connectedAt)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex gap-1.5">
        {connected ? (
          <button
            onClick={onDisconnect}
            className="flex-1 rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
              isConnecting
                ? "bg-secondary text-muted-foreground cursor-wait"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {isConnecting ? (
              <span className="flex items-center justify-center gap-1">
                <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-[9px]" />
                Connecting...
              </span>
            ) : (
              "Connect"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  communication: "Communication",
  productivity: "Productivity",
  financial: "Financial",
  crm: "CRM",
  social: "Social Media",
};

const CATEGORY_ORDER = ["communication", "productivity", "financial", "crm", "social"];

export function ConnectionsSidebar() {
  const {
    connections,
    providers,
    loading,
    connecting,
    initiateConnection,
    disconnectConnection,
    syncConnections,
  } = useConnections();

  const activeConnections = connections.filter((c) => c.status === "active");

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] || cat,
    items: providers.filter((p) => p.category === cat),
  })).filter((g) => g.items.length > 0);

  const getConnection = (provider: SupportedProvider) =>
    activeConnections.find(
      (c) => c.provider === provider.id || c.provider === provider.appName
    );

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Connections
        </h3>
        <button
          onClick={syncConnections}
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title="Sync connections"
        >
          <FaIcon icon="fa-solid fa-arrows-rotate" className="text-[10px]" />
        </button>
      </div>

      {activeConnections.length > 0 && (
        <div className="px-3 pb-2">
          <div className="rounded-md bg-green-500/5 border border-green-500/20 px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-medium text-green-400">
                {activeConnections.length} connected
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {activeConnections.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-300"
                >
                  {c.providerInfo && (
                    <FaIcon icon={c.providerInfo.icon} className="text-[8px]" />
                  )}
                  {c.accountLabel || c.provider}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 pb-3">
        {loading && providers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-lg text-muted-foreground/30" />
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ category, label, items }) => (
              <div key={category}>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-2 px-0.5">
                  {label}
                </p>
                <div className="space-y-2">
                  {items.map((provider) => {
                    const conn = getConnection(provider);
                    return (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        connected={!!conn}
                        connectionId={conn?.id}
                        connectedAt={conn?.connectedAt}
                        isConnecting={connecting === provider.id}
                        onConnect={() => initiateConnection(provider.id)}
                        onDisconnect={() => conn && disconnectConnection(conn.id)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
