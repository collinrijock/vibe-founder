import { useState, useEffect, useRef } from "react";
import { FaIcon } from "@/components/ui/fa-icon";
import { cn } from "@/lib/utils";

const CAROUSEL_ICONS = [
  { icon: "fa-solid fa-lightbulb", label: "Ideas" },
  { icon: "fa-solid fa-chart-line", label: "Growth" },
  { icon: "fa-solid fa-users", label: "Customers" },
  { icon: "fa-solid fa-gears", label: "Operations" },
  { icon: "fa-solid fa-hand-holding-dollar", label: "Revenue" },
  { icon: "fa-solid fa-bullseye", label: "Strategy" },
  { icon: "fa-solid fa-rocket", label: "Launch" },
  { icon: "fa-solid fa-compass", label: "Mission" },
];

const STATUS_MESSAGES = [
  "Analyzing your conversation...",
  "Extracting business details...",
  "Building your business profile...",
  "Structuring action plans...",
  "Finalizing everything...",
];

interface BusinessCreationOverlayProps {
  visible: boolean;
  onDone?: () => void;
  done?: boolean;
}

export function BusinessCreationOverlay({
  visible,
  done,
  onDone,
}: BusinessCreationOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [exiting, setExiting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!visible) return;

    setProgress(0);
    setStatusIdx(0);
    setExiting(false);

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      // Logarithmic ease-out: fast at first, then crawls.
      // Reaches ~40% at 10s, ~55% at 30s, ~65% at 60s, asymptotically approaches 80%.
      const t = elapsed / 1000;
      const target = Math.min(80, 80 * (1 - 1 / (1 + t / 15)));
      setProgress(target);
    }, 100);

    statusIntervalRef.current = setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 4000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(statusIntervalRef.current);
    };
  }, [visible]);

  useEffect(() => {
    if (done && visible && !exiting) {
      clearInterval(intervalRef.current);
      clearInterval(statusIntervalRef.current);

      let current = progress;
      const finishInterval = setInterval(() => {
        current += 3;
        if (current >= 100) {
          current = 100;
          clearInterval(finishInterval);
          setTimeout(() => {
            setExiting(true);
            setTimeout(() => onDone?.(), 500);
          }, 300);
        }
        setProgress(current);
      }, 20);

      return () => clearInterval(finishInterval);
    }
  }, [done, visible]);

  if (!visible && !exiting) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-9999 flex flex-col items-center justify-center bg-background transition-opacity duration-500",
        exiting ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      <div className="flex flex-col items-center gap-8 px-4">
        {/* Icon carousel */}
        <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-primary/5">
          <div className="icon-carousel absolute inset-0 flex flex-col items-center">
            {CAROUSEL_ICONS.concat(CAROUSEL_ICONS).map((item, i) => (
              <div
                key={i}
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1.5"
              >
                <FaIcon icon={item.icon} className="text-2xl text-primary" />
                <span className="text-[10px] font-medium text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            Creating your business
          </h2>
          <p className="h-5 text-sm text-muted-foreground transition-opacity duration-300">
            {STATUS_MESSAGES[statusIdx]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 overflow-hidden rounded-full bg-muted h-1.5">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground/50">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}
