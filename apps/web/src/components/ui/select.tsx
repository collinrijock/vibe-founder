import * as React from "react";
import { cn } from "@/lib/utils";
import { FaIcon } from "@/components/ui/fa-icon";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ value, onChange, options, className, disabled }, ref) => {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const selected = options.find((o) => o.value === value);

    React.useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
      <div ref={containerRef} className="relative">
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
            className
          )}
        >
          {selected?.label ?? value}
          <FaIcon icon="fa-solid fa-chevron-down" className="text-[10px]" />
        </button>

        {open && (
          <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[180px] overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in fade-in-0 zoom-in-95">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-left text-xs transition-colors hover:bg-secondary",
                  option.value === value
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
