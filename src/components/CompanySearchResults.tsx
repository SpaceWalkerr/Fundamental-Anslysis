import { useEffect, useState } from "react";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  sector: string | null;
}

interface CompanySearchResultsProps {
  query: string;
  isLoading?: boolean;
  onAnalyze: (company: any) => void;
}

const getExchangeBadge = (exchange: string) => {
  const cleanExch = (exchange || "").toUpperCase().trim();
  switch (cleanExch) {
    case 'NSI':
      return { label: 'NSE', color: '#00d4aa' };
    case 'BSE':
      return { label: 'BSE', color: '#ffb86c' };
    case 'NMS':
      return { label: 'NASDAQ', color: '#6c63ff' };
    case 'NYQ':
      return { label: 'NYSE', color: '#6c63ff' };
    case 'CCC':
      return { label: 'CRYPTO', color: '#ff9f43' };
    case 'TOR':
      return { label: 'TSX', color: '#6c63ff' };
    case 'LSE':
      return { label: 'LSE', color: '#a89fff' };
    default:
      return { label: exchange || 'UNKNOWN', color: '#8888a0' };
  }
};

const cleanDisplaySymbol = (symbol: string) => {
  return symbol.replace(/\.(NS|BO)$/i, '');
};

const CompanySearchResults = ({
  query,
  onAnalyze,
}: CompanySearchResultsProps) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const url = `${baseUrl}/api/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error("Search API failed");
        }
        const data = await res.json();
        const quotes = data.quotes || [];
        const filtered = quotes
          .filter((q: any) => {
            const type = (q.quoteType || "").toUpperCase();
            return (
              type === "EQUITY" ||
              type === "ETF" ||
              type === "CRYPTOCURRENCY" ||
              type === "INDEX"
            );
          })
          .map((q: any) => ({
            symbol: q.symbol,
            name: q.longname || q.shortname || q.symbol,
            exchange: q.exchange,
            type: q.quoteType,
            sector: q.sector || null,
          }));
        setResults(filtered);
      } catch (err) {
        console.error("Error searching companies:", err);
        setError(true);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // Loading State: 3 skeleton rows
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[40px] bg-[var(--bg-card)] rounded-[6px] animate-pulse relative overflow-hidden flex items-center justify-between px-3"
          >
            <div className="space-y-1 flex-1">
              <div className="h-3 w-1/4 bg-[var(--border-token)] rounded" />
              <div className="h-2.5 w-1/2 bg-[var(--border-token)] rounded opacity-50 mt-[2px]" />
            </div>
            <div className="h-4 w-12 bg-[var(--border-token)] rounded-[4px]" />
          </div>
        ))}
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="py-8 text-center text-sm text-[var(--loss-token)] font-semibold">
        Search unavailable. Check your connection and try again.
      </div>
    );
  }

  // Initial State / Empty Query
  if (query.trim().length < 2) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-muted-token)]">
        Start typing to search companies (min 2 characters)
      </div>
    );
  }

  // Empty State: 0 results found
  if (results.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-muted-token)] leading-relaxed">
        No results for "{query}" — try a ticker symbol like AAPL or RELIANCE
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {results.map((result) => {
        const badge = getExchangeBadge(result.exchange);
        return (
          <div
            key={result.symbol}
            onClick={() => {
              // Construct a Company object compatible with downstream handlers
              const company = {
                id: result.symbol,
                name: result.name,
                ticker: result.symbol,
                exchange: badge.label,
                sector: result.sector || result.type || "Listed Security",
                price: 0,
                changePercent: 0,
                peRatio: 0,
                revenueGrowth: 0,
                profitMargin: 0,
                marketCap: "N/A",
                currency: String(result.symbol).endsWith(".NS") ? "INR" : "USD",
              };
              onAnalyze(company);
            }}
            className="flex items-center justify-between cursor-pointer p-[10px_14px] border-b border-[var(--border-token)] last:border-0 hover:bg-[var(--bg-card)] rounded-md transition-colors"
          >
            <div>
              <span
                className="text-[13px] font-semibold text-[var(--text-primary-token)] block"
                style={{ fontFamily: "'DM Mono', 'IBM Plex Mono', monospace" }}
              >
                {cleanDisplaySymbol(result.symbol)}
              </span>
              <span className="text-[12px] text-[var(--text-muted-token)] block mt-[2px]">
                {result.name}
              </span>
            </div>
            <span
              className="text-[10px] font-semibold rounded-[4px] px-[6px] py-[1px] border"
              style={{
                borderColor: badge.color,
                color: badge.color,
              }}
            >
              {badge.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CompanySearchResults;
