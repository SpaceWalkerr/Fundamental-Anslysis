import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { REGIONS, type RegionCode } from "@/lib/region";
import { useRegion } from "@/hooks/use-region";

const ORDER: RegionCode[] = ["IN", "US", "GB", "EU", "AE", "SG", "GLOBAL"];

/**
 * Compact region + currency switcher. Shows the active region's flag +
 * currency; opens a dropdown of all supported regions. Changing it updates
 * the whole app (prices, symbols, examples) instantly.
 */
export default function RegionSwitcher({ compact = false }: { compact?: boolean }) {
  const { region, config, setRegion } = useRegion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-white text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
        aria-label="Change region and currency"
      >
        <span className="text-base leading-none">{config.flag}</span>
        {!compact && <span>{config.currency}</span>}
        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-border shadow-lg z-[10100] py-1">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Region &amp; currency
          </div>
          {ORDER.map((code) => {
            const r = REGIONS[code];
            return (
              <button
                key={code}
                onClick={() => { setRegion(code); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
              >
                <span className="text-base">{r.flag}</span>
                <span className="flex-1 text-foreground">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.symbol} {r.currency}</span>
                {region === code && <Check className="w-4 h-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
