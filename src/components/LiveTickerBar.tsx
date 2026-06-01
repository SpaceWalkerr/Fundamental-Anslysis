import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Region = "ALL" | "India" | "US" | "Global" | "Crypto";

interface SymbolConfig {
  symbol: string;
  region: Exclude<Region, "ALL">;
}

interface TickerQuote {
  symbol: string;
  shortName?: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  currency: string;
  region: Exclude<Region, "ALL">;
}

const symbolGroups: SymbolConfig[] = [
  ..."RELIANCE.NS,TCS.NS,INFY.NS,HDFCBANK.NS,ICICIBANK.NS,WIPRO.NS,SBIN.NS,MARUTI.NS,AXISBANK.NS,TITAN.NS,BAJFINANCE.NS,ULTRACEMCO.NS,ADANIENT.NS,HINDUNILVR.NS"
    .split(",")
    .map((symbol) => ({ symbol, region: "India" as const })),
  ..."AAPL,MSFT,GOOGL,AMZN,TSLA,NVDA,META,JPM,BRK-B,NFLX"
    .split(",")
    .map((symbol) => ({ symbol, region: "US" as const })),
  ..."ASML.AS,SAP.DE,LVMH.PA,SHEL.L,NESN.SW,7203.T,005930.KS,0700.HK,^NSEI,^BSESN,^GSPC,^DJI,^IXIC"
    .split(",")
    .map((symbol) => ({ symbol, region: "Global" as const })),
  ..."BTC-USD,ETH-USD,SOL-USD,BNB-USD"
    .split(",")
    .map((symbol) => ({ symbol, region: "Crypto" as const })),
];

const fallbackQuotes: TickerQuote[] = [
  { symbol: "RELIANCE.NS", regularMarketPrice: 2918.4, regularMarketChangePercent: 1.02, currency: "INR", region: "India" },
  { symbol: "TCS.NS", regularMarketPrice: 3842.2, regularMarketChangePercent: -0.47, currency: "INR", region: "India" },
  { symbol: "AAPL", regularMarketPrice: 189.98, regularMarketChangePercent: 0.62, currency: "USD", region: "US" },
  { symbol: "MSFT", regularMarketPrice: 428.74, regularMarketChangePercent: -0.18, currency: "USD", region: "US" },
  { symbol: "ASML.AS", regularMarketPrice: 912.4, regularMarketChangePercent: 0.44, currency: "EUR", region: "Global" },
  { symbol: "7203.T", regularMarketPrice: 3421, regularMarketChangePercent: -0.31, currency: "JPY", region: "Global" },
  { symbol: "BTC-USD", regularMarketPrice: 68240.2, regularMarketChangePercent: 1.9, currency: "USD", region: "Crypto" },
  { symbol: "ETH-USD", regularMarketPrice: 3678.8, regularMarketChangePercent: -0.72, currency: "USD", region: "Crypto" },
];

const regions: Region[] = ["ALL", "India", "US", "Global", "Crypto"];

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));

const formatINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPrice = (quote: TickerQuote) => {
  if (quote.currency === "INR") return formatINR(quote.regularMarketPrice);

  const digits = quote.regularMarketPrice > 1000 ? 0 : 2;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: quote.currency || "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(quote.regularMarketPrice);
};

const cleanSymbol = (symbol: string) => symbol.replace(/\.(NS|BO|AS|DE|PA|L|SW|T|KS|HK)$/i, "");

interface LiveTickerBarProps {
  className?: string;
}

const LiveTickerBar = ({ className }: LiveTickerBarProps) => {
  const [quotes, setQuotes] = useState<TickerQuote[]>(fallbackQuotes);
  const [region, setRegion] = useState<Region>("ALL");

  useEffect(() => {
    let mounted = true;

    const loadQuotes = async () => {
      try {
        const batches = chunk(symbolGroups, 10);
        const responses = await Promise.all(
          batches.map(async (batch) => {
            const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${batch
              .map((item) => item.symbol)
              .join(",")}`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            const parsed = JSON.parse(data.contents);
            const regionBySymbol = new Map(batch.map((item) => [item.symbol, item.region]));

            return (parsed.quoteResponse?.result || []).map((quote: any) => ({
              symbol: quote.symbol,
              shortName: quote.shortName,
              regularMarketPrice: Number(quote.regularMarketPrice || 0),
              regularMarketChangePercent: Number(quote.regularMarketChangePercent || 0),
              currency: quote.currency || (quote.symbol?.endsWith(".NS") ? "INR" : "USD"),
              region: regionBySymbol.get(quote.symbol) || "Global",
            }));
          })
        );

        const merged = responses.flat().filter((quote) => quote.regularMarketPrice > 0);
        if (mounted && merged.length > 0) setQuotes(merged);
      } catch {
        if (mounted) setQuotes(fallbackQuotes);
      }
    };

    loadQuotes();
    const interval = window.setInterval(loadQuotes, 60000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const filteredQuotes = useMemo(
    () => (region === "ALL" ? quotes : quotes.filter((quote) => quote.region === region)),
    [quotes, region]
  );
  const row = [...filteredQuotes, ...filteredQuotes];

  return (
    <div className={cn("ticker-wrap h-12 border-b border-[var(--border-token)] bg-[var(--bg-primary)]", className)}>
      <div className="flex h-full items-center">
        <div className="flex h-full shrink-0 items-center border-r border-[var(--border-token)] bg-[var(--bg-card)] px-2">
          {regions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRegion(item)}
              className={cn(
                "rounded px-2 py-1 font-market text-[10px] uppercase tracking-[0.08em]",
                region === item
                  ? "bg-[var(--accent-token)] text-[var(--button-primary-text)]"
                  : "text-[var(--text-muted-token)] hover:text-[var(--text-primary-token)]"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="h-full flex-1 overflow-hidden">
          <div className="ticker-track flex h-full w-max animate-ticker items-center whitespace-nowrap">
            {row.map((quote, index) => {
              const positive = quote.regularMarketChangePercent >= 0;
              const pct = `${positive ? "+" : ""}${quote.regularMarketChangePercent.toFixed(2)}%`;

              return (
                <div key={`${quote.symbol}-${index}`} className="flex h-full items-center border-r border-[var(--border-token)] px-4 font-market tabular-nums">
                  <span className="mr-2 font-semibold text-[var(--text-primary-token)]">{cleanSymbol(quote.symbol)}</span>
                  <span className="mr-2 text-[var(--text-muted-token)]">{formatPrice(quote)}</span>
                  <span className={positive ? "text-profit" : "text-loss"}>{pct}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTickerBar;
