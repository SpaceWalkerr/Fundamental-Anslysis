/**
 * Region service — makes the whole app region-aware.
 *
 * Resolves the user's region (IP → heuristic → US), exposes currency,
 * number formatting, market/ticker defaults, financial jargon, and live FX
 * conversion. The user can override the region; the choice persists and
 * notifies subscribers so open views re-render instantly.
 */

export type RegionCode = "IN" | "US" | "GB" | "EU" | "AE" | "SG" | "GLOBAL";
export type Currency = "INR" | "USD" | "GBP" | "EUR" | "AED" | "SGD";

export interface RegionJargon {
  sip: string;          // recurring-investment word
  taxWrapper: string;   // tax-advantaged accounts
  retirement: string;   // retirement scheme
}

export interface RegionConfig {
  code: RegionCode;
  name: string;
  flag: string;
  currency: Currency;
  symbol: string;
  locale: string;
  numberSystem: "lakh" | "western";
  gateway: "razorpay" | "razorpay-intl";
  timezone: string;
  market: "india" | "us"; // which scanner universe fits best
  tickers: string[];
  jargon: RegionJargon;
  defaults: { inflation: number; equityReturn: number; retirementAge: number };
}

export const REGIONS: Record<RegionCode, RegionConfig> = {
  IN: {
    code: "IN", name: "India", flag: "🇮🇳", currency: "INR", symbol: "₹",
    locale: "en-IN", numberSystem: "lakh", gateway: "razorpay",
    timezone: "Asia/Kolkata", market: "india",
    tickers: ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"],
    jargon: { sip: "SIP", taxWrapper: "PPF/ELSS", retirement: "EPF/NPS" },
    defaults: { inflation: 6, equityReturn: 12, retirementAge: 60 },
  },
  US: {
    code: "US", name: "United States", flag: "🇺🇸", currency: "USD", symbol: "$",
    locale: "en-US", numberSystem: "western", gateway: "razorpay-intl",
    timezone: "America/New_York", market: "us",
    tickers: ["AAPL", "MSFT", "NVDA", "GOOGL"],
    jargon: { sip: "recurring investing (DCA)", taxWrapper: "Roth IRA/401(k)", retirement: "401(k)/IRA" },
    defaults: { inflation: 2.5, equityReturn: 8, retirementAge: 65 },
  },
  GB: {
    code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP", symbol: "£",
    locale: "en-GB", numberSystem: "western", gateway: "razorpay-intl",
    timezone: "Europe/London", market: "us",
    tickers: ["SHEL.L", "HSBA.L", "AZN.L", "ULVR.L"],
    jargon: { sip: "regular investing", taxWrapper: "ISA", retirement: "SIPP/pension" },
    defaults: { inflation: 2.5, equityReturn: 7, retirementAge: 66 },
  },
  EU: {
    code: "EU", name: "Europe", flag: "🇪🇺", currency: "EUR", symbol: "€",
    locale: "de-DE", numberSystem: "western", gateway: "razorpay-intl",
    timezone: "Europe/Berlin", market: "us",
    tickers: ["ASML", "SAP", "MC.PA", "SIE.DE"],
    jargon: { sip: "savings plan (Sparplan)", taxWrapper: "tax-advantaged account", retirement: "pension" },
    defaults: { inflation: 2, equityReturn: 7, retirementAge: 65 },
  },
  AE: {
    code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currency: "AED", symbol: "د.إ",
    locale: "en-AE", numberSystem: "western", gateway: "razorpay-intl",
    timezone: "Asia/Dubai", market: "us",
    tickers: ["AAPL", "MSFT", "NVDA", "EMAAR.AE"],
    jargon: { sip: "recurring investing", taxWrapper: "savings plan", retirement: "pension/end-of-service" },
    defaults: { inflation: 2.5, equityReturn: 7, retirementAge: 60 },
  },
  SG: {
    code: "SG", name: "Singapore", flag: "🇸🇬", currency: "SGD", symbol: "S$",
    locale: "en-SG", numberSystem: "western", gateway: "razorpay-intl",
    timezone: "Asia/Singapore", market: "us",
    tickers: ["D05.SI", "O39.SI", "AAPL", "MSFT"],
    jargon: { sip: "recurring investing (RSP)", taxWrapper: "SRS", retirement: "CPF" },
    defaults: { inflation: 2, equityReturn: 7, retirementAge: 63 },
  },
  GLOBAL: {
    code: "GLOBAL", name: "Global", flag: "🌍", currency: "USD", symbol: "$",
    locale: "en-US", numberSystem: "western", gateway: "razorpay-intl",
    timezone: "UTC", market: "us",
    tickers: ["AAPL", "MSFT", "NVDA", "GOOGL"],
    jargon: { sip: "recurring investing", taxWrapper: "tax-advantaged account", retirement: "retirement account" },
    defaults: { inflation: 3, equityReturn: 8, retirementAge: 65 },
  },
};

const STORAGE_KEY = "xtin_region_v1";
const LEGACY_CURRENCY_KEY = "fk_currency";
const IP_CACHE_KEY = "xtin_ip_region";
const FX_CACHE_KEY = "xtin_fx_rates";

// Map an ISO country code (from IP) to one of our region buckets.
function countryToRegion(country: string): RegionCode {
  const c = (country || "").toUpperCase();
  if (c === "IN") return "IN";
  if (c === "US") return "US";
  if (c === "GB" || c === "UK") return "GB";
  if (c === "AE") return "AE";
  if (c === "SG") return "SG";
  const EUROZONE = ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "IE", "PT", "FI", "GR", "SK", "SI", "LU", "LV", "LT", "EE", "CY", "MT"];
  if (EUROZONE.includes(c)) return "EU";
  return "GLOBAL";
}

let _region: RegionCode = "US";
const subscribers = new Set<(r: RegionCode) => void>();

function readSaved(): RegionCode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as RegionCode | null;
    if (v && REGIONS[v]) return v;
    // Migrate the legacy fk_currency choice.
    const legacy = localStorage.getItem(LEGACY_CURRENCY_KEY);
    if (legacy === "INR") return "IN";
    if (legacy === "USD") return "US";
  } catch { /* ignore */ }
  return null;
}

function heuristicRegion(): RegionCode {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const locale = (navigator.language || "").toLowerCase();
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta" || locale.endsWith("-in")) return "IN";
    if (tz === "Europe/London" || locale.endsWith("-gb")) return "GB";
    if (tz === "Asia/Dubai") return "AE";
    if (tz === "Asia/Singapore") return "SG";
    if (tz.startsWith("Europe/")) return "EU";
    if (tz.startsWith("America/")) return "US";
  } catch { /* ignore */ }
  return "US";
}

async function ipRegion(): Promise<RegionCode | null> {
  // 24h cache
  try {
    const cached = JSON.parse(localStorage.getItem(IP_CACHE_KEY) || "null");
    if (cached && Date.now() - cached.at < 24 * 3600 * 1000 && cached.region) {
      return cached.region as RegionCode;
    }
  } catch { /* ignore */ }

  const endpoints = [
    { url: "https://ipapi.co/json/", pick: (d: any) => d.country_code || d.country },
    { url: "https://ipwho.is/", pick: (d: any) => d.country_code },
  ];
  for (const ep of endpoints) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch(ep.url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const data = await res.json();
      const country = ep.pick(data);
      if (country) {
        const region = countryToRegion(country);
        try { localStorage.setItem(IP_CACHE_KEY, JSON.stringify({ region, at: Date.now() })); } catch { /* ignore */ }
        return region;
      }
    } catch { /* try next */ }
  }
  return null;
}

const TOAST_KEY = "xtin_region_toast_v1";

/** Resolve the region: saved override → IP → heuristic → US. */
export async function detectRegion(): Promise<RegionCode> {
  const saved = readSaved();
  if (saved) { _region = saved; return saved; }
  // Start from heuristic instantly, then refine with IP.
  _region = heuristicRegion();
  const ip = await ipRegion();
  if (ip) _region = ip;
  notify();
  // First visit (no manual override yet): offer a one-time "we set your
  // region" toast so the auto-detection is transparent and reversible.
  try {
    if (!localStorage.getItem(TOAST_KEY)) {
      window.dispatchEvent(new CustomEvent("xtin:region-detected", { detail: _region }));
    }
  } catch { /* ignore */ }
  return _region;
}

/** Mark the first-visit region toast as shown so it never repeats. */
export function ackRegionToast() {
  try { localStorage.setItem(TOAST_KEY, "1"); } catch { /* ignore */ }
}

export function getRegion(): RegionCode { return _region; }
export function getRegionConfig(code?: RegionCode): RegionConfig { return REGIONS[code || _region]; }

export function setRegion(code: RegionCode) {
  if (!REGIONS[code]) return;
  _region = code;
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  notify();
}

export function subscribeRegion(cb: (r: RegionCode) => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function notify() {
  subscribers.forEach((cb) => cb(_region));
  try { window.dispatchEvent(new CustomEvent("xtin:region-changed", { detail: _region })); } catch { /* ignore */ }
}

/** Format a whole-unit amount in the region's currency. */
export function formatMoney(amount: number, opts?: { compact?: boolean; region?: RegionCode }): string {
  const cfg = REGIONS[opts?.region || _region];
  const sym = cfg.symbol;
  const n = Number(amount) || 0;
  if (opts?.compact) {
    const abs = Math.abs(n);
    if (cfg.numberSystem === "lakh") {
      if (abs >= 1e7) return `${sym}${(n / 1e7).toFixed(2).replace(/\.00$/, "")}Cr`;
      if (abs >= 1e5) return `${sym}${(n / 1e5).toFixed(2).replace(/\.00$/, "")}L`;
    } else {
      if (abs >= 1e9) return `${sym}${(n / 1e9).toFixed(2).replace(/\.00$/, "")}B`;
      if (abs >= 1e6) return `${sym}${(n / 1e6).toFixed(2).replace(/\.00$/, "")}M`;
      if (abs >= 1e3) return `${sym}${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
    }
  }
  return `${sym}${Math.round(n).toLocaleString(cfg.locale)}`;
}

export function currencyOf(region?: RegionCode): Currency { return REGIONS[region || _region].currency; }
export function symbolOf(region?: RegionCode): string { return REGIONS[region || _region].symbol; }

/**
 * Curated "Popular:" example tickers for search pills — region's own market
 * first, then a couple of globally-recognised names so the list never feels
 * parochial. Symbols are ready to paste into the analyzer search.
 */
export function popularTickers(region?: RegionCode): string[] {
  const code = region || _region;
  const IN = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"];
  const US = ["AAPL", "MSFT", "NVDA", "GOOGL"];
  switch (code) {
    case "IN": return [...IN, "AAPL", "MSFT"];
    case "GB": return ["SHEL.L", "HSBA.L", "AZN.L", "AAPL", "MSFT"];
    case "EU": return ["ASML", "SAP", "MC.PA", "AAPL", "MSFT"];
    case "AE": return ["AAPL", "MSFT", "NVDA", "GOOGL", "TSLA"];
    case "SG": return ["D05.SI", "O39.SI", "AAPL", "MSFT", "NVDA"];
    default: return [...US, "TSLA", "AMZN"];
  }
}

// ---- FX (frankfurter, base USD), 12h cache + emergency fallback ----
const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1, INR: 83, GBP: 0.79, EUR: 0.92, AED: 3.67, SGD: 1.35,
};

let _rates: Record<string, number> = { ...FALLBACK_RATES };

export async function getRates(): Promise<Record<string, number>> {
  try {
    const cached = JSON.parse(localStorage.getItem(FX_CACHE_KEY) || "null");
    if (cached && Date.now() - cached.at < 12 * 3600 * 1000 && cached.rates) {
      _rates = { USD: 1, ...cached.rates };
      return _rates;
    }
  } catch { /* ignore */ }
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR,GBP,EUR,AED,SGD");
    if (res.ok) {
      const data = await res.json();
      _rates = { USD: 1, ...data.rates };
      try { localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ rates: data.rates, at: Date.now() })); } catch { /* ignore */ }
    }
  } catch { /* keep fallback */ }
  return _rates;
}

/** Convert between currencies using cached rates (base USD). */
export function convert(amount: number, from: Currency, to: Currency): number {
  const rFrom = _rates[from] ?? FALLBACK_RATES[from] ?? 1;
  const rTo = _rates[to] ?? FALLBACK_RATES[to] ?? 1;
  if (!rFrom) return amount;
  return (amount / rFrom) * rTo;
}
