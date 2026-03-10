import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard = ({
  label,
  value,
  change,
  trend = "neutral",
  icon,
  className,
}: StatCardProps) => {
  const trendColor = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <div
      className={cn(
        "rounded-lg bg-card border border-border p-5 hover:border-primary/50 transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-foreground">
          {value}
        </p>
        {change !== undefined && (
          <span className={cn("text-sm font-medium", trendColor[trend])}>
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        )}
      </div>
    </div>
  );
};
