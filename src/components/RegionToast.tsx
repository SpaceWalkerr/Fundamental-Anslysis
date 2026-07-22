import { useEffect } from "react";
import { toast } from "sonner";
import { getRegionConfig, ackRegionToast, type RegionCode } from "@/lib/region";

/**
 * First-visit region notice. When the app auto-detects a region (no manual
 * override stored yet) it fires `xtin:region-detected`; we surface a small,
 * non-blocking toast so the choice is transparent and reversible via the
 * always-visible RegionSwitcher. Shown at most once per browser.
 */
export default function RegionToast() {
  useEffect(() => {
    const onDetected = (e: Event) => {
      const code = (e as CustomEvent<RegionCode>).detail;
      const cfg = getRegionConfig(code);
      ackRegionToast();
      toast(`${cfg.flag} Prices & examples set for ${cfg.name}`, {
        description: `Showing ${cfg.symbol} ${cfg.currency}. Change it anytime from the region switcher.`,
        duration: 8000,
      });
    };
    window.addEventListener("xtin:region-detected", onDetected as EventListener);
    return () => window.removeEventListener("xtin:region-detected", onDetected as EventListener);
  }, []);

  return null;
}
