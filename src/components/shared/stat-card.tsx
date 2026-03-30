import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: "default" | "cta" | "success" | "purple";
  className?: string;
}

const variantStyles = {
  default: {
    icon: "bg-primary/10 text-primary",
    value: "text-foreground",
  },
  cta: {
    icon: "bg-emerald-500/10 text-emerald-400",
    value: "text-emerald-400",
  },
  success: {
    icon: "bg-emerald-500/10 text-emerald-400",
    value: "text-emerald-400",
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
        "glass-card p-5 hover:-translate-y-1",
        "hover:shadow-[0_12px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(16,185,129,0.15)]",
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
