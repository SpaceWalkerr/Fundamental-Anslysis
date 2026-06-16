import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TrendingUp, TrendingDown, Search } from "lucide-react";

interface Company {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  price: number;
  changePercent: number;
  peRatio: number | null;
  revenueGrowth: number | null;
  profitMargin: number | null;
  marketCap: string;
  currency?: string;
}

interface CompanySearchResultsProps {
  query: string;
  isLoading?: boolean;
  onAnalyze: (company: Company) => void;
}

const CompanySearchResults = ({
  query,
  isLoading = false,
  onAnalyze,
}: CompanySearchResultsProps) => {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setCompanies([]);
      return;
    }

    const searchCompanies = async () => {
      setFetching(true);
      setError(null);
      try {
        const response = await api.analysis.searchCompany(query);
        const mapped = response.map((item: any) => ({
          id: item.id || item.ticker,
          name: item.name || item.ticker,
          ticker: item.ticker,
          sector: item.sector || "Equity",
          price: item.price || 0,
          changePercent: item.change_percent || 0,
          peRatio: item.pe_ratio !== null && item.pe_ratio !== undefined ? item.pe_ratio : null,
          revenueGrowth: item.revenue_growth !== null && item.revenue_growth !== undefined ? item.revenue_growth : null,
          profitMargin: item.profit_margin !== null && item.profit_margin !== undefined ? item.profit_margin : null,
          marketCap: item.market_cap || "N/A",
          currency: item.currency || "USD",
        }));
        const filtered = mapped.filter((item: any) => {
          const tickerUpper = item.ticker.toUpperCase();
          
          const isIndian = tickerUpper.endsWith(".NS") || tickerUpper.endsWith(".BO");
          let isUS = false;
          if (!isIndian) {
            if (tickerUpper.includes(".")) {
              const parts = tickerUpper.split(".");
              isUS = parts[parts.length - 1].length === 1;
            } else {
              const hasOptionPattern = /^[A-Z]{1,6}\d{6}[CP]\d{8}$/i.test(tickerUpper);
              const isCrypto = tickerUpper.includes("-") && (tickerUpper.endsWith("-USD") || tickerUpper.endsWith("-EUR") || tickerUpper.endsWith("-INR"));
              isUS = !hasOptionPattern && !isCrypto;
            }
          }
          
          const sectorUpper = (item.sector || "").toUpperCase();
          const nameUpper = (item.name || "").toUpperCase();
          const isOption = sectorUpper.includes("OPTION") || nameUpper.includes("OPTION");
          const isETF = sectorUpper.includes("ETF") || sectorUpper.includes("EXCHANGE TRADED FUND") || nameUpper.includes(" ETF") || nameUpper.includes("TRUST");
          
          return (isIndian || isUS) && !isOption && !isETF;
        });

        const indianStocks = filtered.filter((item: any) => item.ticker.toUpperCase().endsWith(".NS") || item.ticker.toUpperCase().endsWith(".BO"));
        const usStocks = filtered.filter((item: any) => !(item.ticker.toUpperCase().endsWith(".NS") || item.ticker.toUpperCase().endsWith(".BO")));
        const sorted = [...indianStocks, ...usStocks];

        setCompanies(sorted);
      } catch (err: any) {
        console.error("Error searching companies:", err);
        setError("Could not retrieve search results.");
      } finally {
        setFetching(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchCompanies();
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const showLoading = isLoading || fetching;

  if (showLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground">Searching companies...</p>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Search className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">Start typing to search companies</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive font-medium">{error}</p>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Search className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">No companies found for "{query}"</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <p className="text-sm text-muted-foreground">
        Found {companies.length} results
      </p>

      {companies.map((company) => (
        <motion.div
          key={company.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ y: -2 }}
          className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 cursor-pointer transition-colors"
          onClick={() => setSelectedCompany(company)}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-foreground">{company.name}</h3>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">
                  {company.ticker}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{company.sector}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">
                {company.currency === "INR" ? "₹" : "$"}{company.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div
                className={`flex items-center justify-end gap-1 text-xs font-medium ${
                  company.changePercent >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {company.changePercent >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(company.changePercent).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="p-2 bg-background/50 rounded">
              <p className="text-xs text-muted-foreground">P/E</p>
              <p className="text-sm font-semibold text-foreground">
                {company.peRatio !== null ? `${company.peRatio.toFixed(1)}x` : "N/A"}
              </p>
            </div>
            <div className="p-2 bg-background/50 rounded">
              <p className="text-xs text-muted-foreground">Rev Growth</p>
              <p className="text-sm font-semibold text-foreground">
                {company.revenueGrowth !== null ? `${company.revenueGrowth.toFixed(1)}%` : "N/A"}
              </p>
            </div>
            <div className="p-2 bg-background/50 rounded">
              <p className="text-xs text-muted-foreground">Margin</p>
              <p className="text-sm font-semibold text-foreground">
                {company.profitMargin !== null ? `${company.profitMargin.toFixed(1)}%` : "N/A"}
              </p>
            </div>
            <div className="p-2 bg-background/50 rounded">
              <p className="text-xs text-muted-foreground">Market Cap</p>
              <p className="text-sm font-semibold text-foreground">
                {company.marketCap || "N/A"}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAnalyze(company);
            }}
            className="w-full bg-primary text-white hover:bg-primary/90 text-xs h-8"
          >
            Analyze This Company
          </Button>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default CompanySearchResults;
