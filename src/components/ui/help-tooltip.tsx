import * as React from "react";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  content: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

/**
 * HelpTooltip - Beginner-friendly contextual help icon
 * Displays a small help icon that shows explanatory text on hover
 */
export function HelpTooltip({
  content,
  className,
  side = "top",
  align = "center",
}: HelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
              "w-4 h-4",
              className
            )}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="sr-only">Help</span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="max-w-xs text-sm leading-relaxed"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface InfoBadgeProps {
  label: string;
  value: string | number;
  helpText?: string;
  variant?: "default" | "success" | "warning" | "destructive";
  className?: string;
}

/**
 * InfoBadge - Display a metric with optional help text
 * Perfect for showing financial metrics to beginners
 */
export function InfoBadge({
  label,
  value,
  helpText,
  variant = "default",
  className,
}: InfoBadgeProps) {
  const variantStyles = {
    default: "bg-secondary text-foreground",
    success: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        variantStyles[variant],
        className
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
      {helpText && <HelpTooltip content={helpText} />}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  helpText?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

/**
 * MetricCard - A card for displaying key metrics with explanations
 * Designed for users who may not understand financial terminology
 */
export function MetricCard({
  title,
  value,
  subtitle,
  helpText,
  icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-2xl bg-white border border-border",
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-accent/30 flex items-center justify-center text-primary">
              {icon}
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">{title}</span>
            {helpText && <HelpTooltip content={helpText} />}
          </div>
        </div>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend.isPositive
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
