import { usePlanStore } from "@/store/usePlanStore";
import { Sparkles } from "lucide-react";

/**
 * Brief full-screen "welcome to Pro" moment after a successful upgrade.
 * Buying should feel like an arrival, not a silent state change.
 */
export default function ProCelebration() {
  const celebrating = usePlanStore((s) => s.celebrating);
  if (!celebrating) return null;

  return (
    <div className="fixed inset-0 z-[10090] flex items-center justify-center bg-[#0E1B2E]/95 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="text-center text-white px-6">
        <div className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-primary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_60px_rgba(22,163,74,0.4)]">
          <Sparkles className="w-9 h-9 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Welcome to Pro</h2>
        <p className="text-white/70">
          Every tool is unlocked. Time to research like an institution.
        </p>
      </div>
    </div>
  );
}
