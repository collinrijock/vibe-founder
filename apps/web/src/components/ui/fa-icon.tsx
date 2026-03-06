import { cn } from "@/lib/utils";

interface FaIconProps {
  icon: string;
  className?: string;
}

export function FaIcon({ icon, className }: FaIconProps) {
  return <i className={cn(icon, className)} aria-hidden="true" />;
}
