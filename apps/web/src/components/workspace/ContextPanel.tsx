import { useQuery } from "@tanstack/react-query";
import { FaIcon } from "@/components/ui/fa-icon";
import { useAuth } from "@/lib/auth";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContextBusiness {
  id: string;
  name: string;
  description: string;
  industry: string;
  stage: string;
}

export function ContextPanel() {
  const { token } = useAuth();

  const { data: businesses = [] } = useQuery<ContextBusiness[]>({
    queryKey: ["businesses"],
    queryFn: async () => {
      const res = await fetch("/api/businesses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.businesses;
    },
    enabled: !!token,
  });

  const activeBusiness = businesses[0] ?? null;

  return (
    <div className="flex h-full flex-col bg-[var(--color-context-panel-bg)]">
      <div className="flex items-center justify-between border-b border-[var(--color-panel-border)] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Context</span>
      </div>

      <ScrollArea className="flex-1">
        {activeBusiness ? (
          <div className="p-3 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-1">{activeBusiness.name}</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{activeBusiness.description || "No description"}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Details</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[11px]">
                  <FaIcon icon="fa-solid fa-industry" className="text-[10px] text-muted-foreground w-3" />
                  <span className="text-muted-foreground">{activeBusiness.industry || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <FaIcon icon="fa-solid fa-signal" className="text-[10px] text-muted-foreground w-3" />
                  <span className="text-muted-foreground">{activeBusiness.stage || "—"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</p>
              <div className="space-y-1">
                {[
                  { label: "Update plan", icon: "fa-solid fa-pen" },
                  { label: "Run agent", icon: "fa-solid fa-robot" },
                  { label: "View metrics", icon: "fa-solid fa-chart-line" },
                ].map((action) => (
                  <button
                    key={action.label}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
                  >
                    <FaIcon icon={action.icon} className="text-[10px] w-3" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <FaIcon icon="fa-solid fa-circle-info" className="text-xl text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground text-center">Context info will appear here based on your current view</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
