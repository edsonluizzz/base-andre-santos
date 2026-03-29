import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: "default" | "gold" | "success" | "purple";
  className?: string;
}

const variantStyles = {
  default: {
    icon: "bg-primary/10 text-primary",
    value: "text-foreground",
  },
  gold: {
    icon: "bg-[var(--gold)]/10 text-[var(--gold)]",
    value: "text-[var(--gold-light)]",
  },
  success: {
    icon: "bg-success/10 text-success",
    value: "text-success",
  },
  purple: {
    icon: "bg-primary/10 text-accent-foreground",
    value: "text-accent-foreground",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/20",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", styles.icon)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={cn("text-2xl font-bold", styles.value)}>{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
