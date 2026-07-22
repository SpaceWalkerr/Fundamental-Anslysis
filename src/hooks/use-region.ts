import { useEffect, useState, useCallback } from "react";
import {
  getRegion,
  getRegionConfig,
  setRegion as setRegionGlobal,
  subscribeRegion,
  detectRegion,
  getRates,
  formatMoney as fmtMoney,
  convert as convertFx,
  type RegionCode,
  type RegionConfig,
  type Currency,
} from "@/lib/region";

let _detectStarted = false;

/**
 * React binding for the region service. Re-renders the component whenever the
 * region changes (from the switcher, IP detection, or another tab).
 */
export function useRegion() {
  const [region, setRegionState] = useState<RegionCode>(getRegion());

  useEffect(() => {
    const unsub = subscribeRegion((r) => setRegionState(r));
    // Kick off IP detection + FX once for the whole app.
    if (!_detectStarted) {
      _detectStarted = true;
      detectRegion().catch(() => {});
      getRates().catch(() => {});
    }
    return () => { unsub(); };
  }, []);

  const config: RegionConfig = getRegionConfig(region);

  const setRegion = useCallback((code: RegionCode) => setRegionGlobal(code), []);
  const formatMoney = useCallback(
    (amount: number, opts?: { compact?: boolean }) => fmtMoney(amount, { ...opts, region }),
    [region]
  );
  const convert = useCallback(
    (amount: number, from: Currency, to: Currency) => convertFx(amount, from, to),
    []
  );

  return {
    region,
    config,
    currency: config.currency,
    symbol: config.symbol,
    setRegion,
    formatMoney,
    convert,
  };
}
