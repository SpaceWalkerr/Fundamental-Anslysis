import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const PremiumBadge = ({ className, size = "md" }: PremiumBadgeProps) => {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-gradient-accent font-medium text-accent-foreground",
        sizeClasses[size],
        className
      )}
    >
      <Sparkles className={cn(size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
      Premium
    </motion.span>
  );
};
