import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBusinessCreation } from "@/lib/business-creation";
import type { BusinessPreview } from "@/hooks/useCopilot";

interface BusinessPreviewWidgetProps {
  preview: BusinessPreview;
  sessionId: string | undefined;
  token: string | null;
  onAccepted: (businessId: string) => void;
}

export function BusinessPreviewWidget({
  preview,
  sessionId,
  token,
  onAccepted,
}: BusinessPreviewWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const overlay = useBusinessCreation();

  const handleAccept = useCallback(async () => {
    if (loading || !token || !sessionId) return;
    setLoading(true);
    setError(null);
    overlay.show();

    try {
      const res = await fetch("/api/businesses/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create business");
      }
      const data = await res.json();
      setAccepted(true);
      queryClient.invalidateQueries({ queryKey: ["businesses"] });

      navigate(`/business/${data.business.id}`);

      await new Promise((r) => setTimeout(r, 600));

      overlay.finish();

      onAccepted(data.business.id);
    } catch (err) {
      overlay.hide();
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [loading, token, sessionId, navigate, queryClient, overlay, onAccepted]);

  if (accepted) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
        <FaIcon icon="fa-solid fa-circle-check" className="text-sm shrink-0" />
        <span>Business created — opening your dashboard...</span>
      </div>
    );
  }

  const fields = [
    { icon: "fa-solid fa-briefcase", label: "Industry", value: preview.industry },
    { icon: "fa-solid fa-users", label: "Target Customer", value: preview.targetCustomer },
    { icon: "fa-solid fa-bullseye", label: "Value Proposition", value: preview.valueProposition },
    { icon: "fa-solid fa-dollar-sign", label: "Revenue Model", value: preview.revenueModel },
  ];

  return (
    <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <FaIcon icon="fa-solid fa-building" className="text-lg text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">
            {preview.name}
          </h3>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            {preview.description}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(({ icon, label, value }) =>
          value ? (
            <div
              key={label}
              className="flex items-start gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2.5"
            >
              <FaIcon icon={icon} className="mt-0.5 text-sm shrink-0 text-muted-foreground/60" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="text-sm text-foreground">{value}</p>
              </div>
            </div>
          ) : null
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          Ready to track this business?
        </p>
        <Button
          onClick={handleAccept}
          disabled={loading || !sessionId}
          size="sm"
          className={cn("gap-2 rounded-xl")}
        >
          {loading ? (
            <FaIcon icon="fa-solid fa-spinner fa-spin" className="text-xs" />
          ) : (
            <FaIcon icon="fa-solid fa-arrow-right" className="text-xs" />
          )}
          {loading ? "Creating..." : "Accept & Create Business"}
        </Button>
      </div>
    </div>
  );
}
