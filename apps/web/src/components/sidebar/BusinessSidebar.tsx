import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { FaIcon } from "@/components/ui/fa-icon";
import { useAuth } from "@/lib/auth";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarBusiness {
  id: string;
  name: string;
  industry: string;
}

export function BusinessSidebar() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeBusinessId = location.pathname.startsWith("/business/")
    ? location.pathname.split("/business/")[1]
    : null;

  const { data: businesses = [] } = useQuery<SidebarBusiness[]>({
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
    refetchInterval: 30_000,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business</h3>
      </div>
      <div className="px-3 pb-2">
        <button
          onClick={() => navigate("/dashboard")}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            location.pathname === "/dashboard"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          )}
        >
          <FaIcon icon="fa-solid fa-gauge-high" className="text-xs" />
          Overview
        </button>
      </div>
      <ScrollArea className="flex-1 px-3">
        {businesses.length > 0 ? (
          <div className="space-y-0.5">
            {businesses.map((b) => (
              <button
                key={b.id}
                onClick={() => navigate(`/business/${b.id}`)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                  activeBusinessId === b.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <FaIcon icon="fa-solid fa-building" className="text-xs shrink-0" />
                <span className="truncate">{b.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-2 py-4 text-center">
            <p className="text-xs text-muted-foreground">No businesses yet</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
