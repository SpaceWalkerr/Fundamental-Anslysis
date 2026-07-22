/**
 * Backwards-compatible currency helpers, now backed by the region service.
 * New code should import from `@/lib/region` / `@/hooks/use-region` directly.
 */
import {
  REGIONS,
  getRegion,
  setRegion,
  currencyOf,
  type Currency,
  type RegionCode,
} from "./region";

export type { Currency };

const CURRENCY_META: Record<Currency, { symbol: string; locale: string }> = {
  INR: { symbol: "₹", locale: "en-IN" },
  USD: { symbol: "$", locale: "en-US" },
  GBP: { symbol: "£", locale: "en-GB" },
  EUR: { symbol: "€", locale: "de-DE" },
  AED: { symbol: "د.إ", locale: "en-AE" },
  SGD: { symbol: "S$", locale: "en-SG" },
};

/** The current region's currency. */
export function detectCurrency(): Currency {
  return currencyOf(getRegion());
}

/** Switch to the first region that uses this currency. */
export function setCurrency(c: Currency) {
  const match = (Object.keys(REGIONS) as RegionCode[]).find((r) => REGIONS[r].currency === c);
  if (match) setRegion(match);
}

/** Format a whole-unit amount with an explicit currency (not the active region). */
export function formatPrice(amount: number, currency: Currency): string {
  const meta = CURRENCY_META[currency] || CURRENCY_META.USD;
  return `${meta.symbol}${Math.round(amount).toLocaleString(meta.locale)}`;
}

export function currencySymbol(currency: Currency): string {
  return (CURRENCY_META[currency] || CURRENCY_META.USD).symbol;
}
