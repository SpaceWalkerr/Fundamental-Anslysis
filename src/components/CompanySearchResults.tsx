import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Search } from "lucide-react";

interface Company {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  price: number;
  changePercent: number;
  peRatio: number;
  revenueGrowth: number;
  profitMargin: number;
  marketCap: string;
}

interface CompanySearchResultsProps {
  query: string;
  isLoading?: boolean;
  onAnalyze: (company: Company) => void;
  compact?: boolean;
}

const mockCompanies: Company[] = [
  {
    id: "1",
    name: "Apple Inc.",
    ticker: "AAPL",
    sector: "Technology",
    price: 225.5,
    changePercent: 2.5,
    peRatio: 28.5,
    revenueGrowth: 2.8,
    profitMargin: 25.5,
    marketCap: "$2.8T",
  },
  {
    id: "2",
    name: "Microsoft Corporation",
    ticker: "MSFT",
    sector: "Technology",
    price: 415.25,
    changePercent: 1.8,
    peRatio: 28.5,
    revenueGrowth: 16.2,
    profitMargin: 35.8,
    marketCap: "$3.1T",
  },
  {
    id: "3",
    name: "NVIDIA Corporation",
    ticker: "NVDA",
    sector: "Technology",
    price: 880.25,
    changePercent: 3.2,
    peRatio: 65.2,
    revenueGrowth: 126.0,
    profitMargin: 52.1,
    marketCap: "$2.2T",
  },
  {
    id: "4",
    name: "Alphabet Inc.",
    ticker: "GOOGL",
    sector: "Technology",
    price: 178.9,
    changePercent: -0.5,
    peRatio: 22.5,
    revenueGrowth: 11.0,
    profitMargin: 24.0,
    marketCap: "$2.2T",
  },
  {
    id: "5",
    name: "Amazon.com Inc.",
    ticker: "AMZN",
    sector: "Consumer Discretionary",
    price: 195.8,
    changePercent: 2.1,
    peRatio: 42.3,
    revenueGrowth: 10.5,
    profitMargin: 3.2,
    marketCap: "$2.0T",
  },
  {
    id: "6",
    name: "Tesla Inc.",
    ticker: "TSLA",
    sector: "Industrials",
    price: 285.2,
    changePercent: -1.2,
    peRatio: 35.8,
    revenueGrowth: 1.8,
    profitMargin: 10.5,
    marketCap: "$900B",
  },
];

const CompanySearchResults = ({
  query,
  isLoading = false,
  onAnalyze,
  compact = false,
}: CompanySearchResultsProps) => {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Filter companies based on query
  const filteredCompanies = mockCompanies.filter(
    (company) =>
      company.name.toLowerCase().includes(query.toLowerCase()) ||
      company.ticker.toLowerCase().includes(query.toLowerCase())
  );

  if (isLoading) {
    if (compact) {
      return (
        <div className="space-y-2 p-1">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/20">
              <div className="flex items-center gap-3 w-2/3">
                <Skeleton className="w-12 h-6 rounded-lg" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="w-24 h-4 rounded" />
                  <Skeleton className="w-16 h-3 rounded" />
                </div>
              </div>
              <div className="space-y-1 text-right">
                <Skeleton className="w-14 h-4 ml-auto rounded" />
                <Skeleton className="w-10 h-3 ml-auto rounded" />
              </div>
            </div>
          ))}
        </div>
      );
    }
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

  if (filteredCompanies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Search className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">No companies found for "{query}"</p>
      </div>
    );
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 select-none scrollbar-thin"
      >
        {filteredCompanies.map((company) => (
          <motion.div
            key={company.id}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.01 }}
            className="flex items-center justify-between p-3 rounded-xl bg-secondary/35 border border-border/40 hover:border-primary/30 hover:bg-accent/15 cursor-pointer transition-all duration-200 group"
            onClick={() => onAnalyze(company)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold font-mono">
                {company.ticker}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                  {company.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {company.sector}
                </p>
              </div>
            </div>
            
            <div className="text-right flex-shrink-0 ml-4">
              <p className="text-sm font-bold text-foreground font-mono">
                ${company.price.toFixed(2)}
              </p>
              <p
                className={`flex items-center justify-end gap-0.5 text-xs font-semibold font-mono ${
                  company.changePercent >= 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {company.changePercent >= 0 ? "+" : ""}
                {company.changePercent.toFixed(2)}%
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <p className="text-sm text-muted-foreground">
        Found {filteredCompanies.length} results
      </p>

      {filteredCompanies.map((company) => (
        <motion.div
          key={company.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ y: -2 }}
          className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 cursor-pointer transition-colors"
          onClick={() => setSelectedCompany(company)}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-medium text-foreground truncate">{company.name}</h3>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">
                  {company.ticker}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{company.sector}</p>
            </div>
            <div className="sm:text-right flex sm:block items-center justify-between sm:justify-end gap-2 flex-shrink-0">
              <div className="text-lg font-bold text-foreground">
                ${company.price.toFixed(2)}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="p-2 bg-background/50 rounded min-w-0">
              <p className="text-xs text-muted-foreground truncate">P/E</p>
              <p className="text-sm font-semibold text-foreground">
                {company.peRatio.toFixed(1)}x
              </p>
            </div>
            <div className="p-2 bg-background/50 rounded min-w-0">
              <p className="text-xs text-muted-foreground truncate">Rev Growth</p>
              <p className="text-sm font-semibold text-foreground">
                {company.revenueGrowth.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 bg-background/50 rounded min-w-0">
              <p className="text-xs text-muted-foreground truncate">Margin</p>
              <p className="text-sm font-semibold text-foreground">
                {company.profitMargin.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 bg-background/50 rounded min-w-0">
              <p className="text-xs text-muted-foreground truncate">Market Cap</p>
              <p className="text-sm font-semibold text-foreground truncate">
                {company.marketCap}
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
