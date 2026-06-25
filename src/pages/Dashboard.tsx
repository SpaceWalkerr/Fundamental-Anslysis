import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CompanySearchResults from "@/components/CompanySearchResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useMarketData } from "@/hooks/use-market-data";
import {
  Search,
  Upload,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  Plus,
  HelpCircle,
  X,
  Loader2,
} from "lucide-react";

const recentReports = [
  {
    id: 1,
    company: "Apple Inc.",
    ticker: "AAPL",
    date: "Jan 28, 2026",
    score: 8.5,
    summary: "Strong profitability with robust cash flow generation. Premium valuation warranted by ecosystem strength.",
    trend: "up",
  },
  {
    id: 2,
    company: "Microsoft Corporation",
    ticker: "MSFT",
    date: "Jan 25, 2026",
    score: 9.1,
    summary: "Exceptional cloud growth with expanding margins. Well-positioned for AI monetization.",
    trend: "up",
  },
  {
    id: 3,
    company: "Tesla Inc.",
    ticker: "TSLA",
    date: "Jan 20, 2026",
    score: 6.2,
    summary: "Revenue growth slowing amid competition. Margin compression concerns but strong balance sheet.",
    trend: "down",
  },
];

const watchlist = [
  { ticker: "AAPL", name: "Apple", price: 225.50, change: 2.35, sparkline: [220, 222, 221, 224, 223, 226, 225.5] },
  { ticker: "MSFT", name: "Microsoft", price: 415.25, change: 1.82, sparkline: [405, 408, 412, 410, 414, 413, 415.25] },
  { ticker: "GOOGL", name: "Alphabet", price: 178.90, change: -0.54, sparkline: [181, 180, 179, 178, 180, 179, 178.9] },
  { ticker: "NVDA", name: "NVIDIA", price: 880.25, change: 5.12, sparkline: [830, 842, 850, 862, 855, 872, 880.25] },
];

/** Pure display helper — returns a greeting based on time of day */
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

/** Pure display helper — returns today's date formatted */
const getFormattedDate = () => {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

/** Compact inline SVG sparkline — pure presentational component */
const Sparkline = ({ points, positive }: { points: number[]; positive: boolean }) => {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min === 0 ? 1 : max - min;
  const height = 18;
  const width = 56;
  
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  const color = positive ? "hsl(var(--primary))" : "hsl(var(--destructive))";

  return (
    <svg width={width} height={height} className="overflow-visible mx-auto">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
};

/** SVG score ring — pure presentational component */
const ScoreRing = ({ score, trend }: { score: number; trend: string }) => {
  const size = 44;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const color = trend === "up" ? "hsl(var(--success))" : "hsl(var(--destructive))";

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className={`score-label ${trend === "up" ? "text-primary" : "text-destructive"}`}>
        {score}
      </span>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuthStore();
  const userKey = user ? `quick_access_watchlist_${user.id}` : "quick_access_watchlist";
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [quickAccessList, setQuickAccessList] = useState<any[]>(() => {
    const cached = localStorage.getItem(userKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const hasIndian = parsed.some((item: any) => item.ticker.toUpperCase().endsWith(".NS") || item.ticker.toUpperCase().endsWith(".BO"));
        if (hasIndian) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse cached quick access list:", e);
      }
    }
    const defaultList = [
      { ticker: "RELIANCE.NS", name: "Reliance Industries", price: 2450.00, change: 1.25 },
      { ticker: "TCS.NS", name: "Tata Consultancy Services", price: 3820.00, change: -0.45 },
      { ticker: "INFY.NS", name: "Infosys", price: 1480.00, change: 2.10 },
      { ticker: "AAPL", name: "Apple", price: 225.50, change: 2.35 },
      { ticker: "MSFT", name: "Microsoft", price: 415.25, change: 1.82 },
    ];
    localStorage.setItem(userKey, JSON.stringify(defaultList));
    return defaultList;
  });

  useEffect(() => {
    const cached = localStorage.getItem(userKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const hasIndian = parsed.some((item: any) => item.ticker.toUpperCase().endsWith(".NS") || item.ticker.toUpperCase().endsWith(".BO"));
        if (hasIndian) {
          setQuickAccessList(parsed);
          return;
        }
      } catch (e) {
        console.error("Failed to parse cached quick access list:", e);
      }
    }
    const defaultList = [
      { ticker: "RELIANCE.NS", name: "Reliance Industries", price: 2450.00, change: 1.25 },
      { ticker: "TCS.NS", name: "Tata Consultancy Services", price: 3820.00, change: -0.45 },
      { ticker: "INFY.NS", name: "Infosys", price: 1480.00, change: 2.10 },
      { ticker: "AAPL", name: "Apple", price: 225.50, change: 2.35 },
      { ticker: "MSFT", name: "Microsoft", price: 415.25, change: 1.82 },
    ];
    localStorage.setItem(userKey, JSON.stringify(defaultList));
    setQuickAccessList(defaultList);
  }, [user?.id]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 25 * 1024 * 1024) {
        alert("File size exceeds 25MB limit.");
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        alert("File size exceeds 25MB limit.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadRedirect = () => {
    if (selectedFile) {
      navigate("/dashboard/analyze", { state: { file: selectedFile, autoStart: true } });
    }
  };
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [quickAccessSearchResults, setQuickAccessSearchResults] = useState<any[]>([]);
  const [loadingQuickAccessSearch, setLoadingQuickAccessSearch] = useState(false);

  useEffect(() => {
    if (!companySearchQuery) {
      setQuickAccessSearchResults([]);
      return;
    }

    const search = async () => {
      setLoadingQuickAccessSearch(true);
      try {
        const results = await api.analysis.searchCompany(companySearchQuery);
        setQuickAccessSearchResults(results || []);
      } catch (err) {
        console.error("Failed to search company for quick access:", err);
      } finally {
        setLoadingQuickAccessSearch(false);
      }
    };

    const delay = setTimeout(search, 300);
    return () => clearTimeout(delay);
  }, [companySearchQuery]);

  const { prices, subscribe } = useMarketData();

  useEffect(() => {
    if (quickAccessList.length > 0) {
      const tickers = quickAccessList.map((item) => item.ticker);
      subscribe(tickers);
    }
  }, [quickAccessList, subscribe]);

  // Fetch initial prices from DB cache on mount
  useEffect(() => {
    const fetchInitialPrices = async () => {
      if (quickAccessList.length === 0) return;
      try {
        const updatedList = await Promise.all(
          quickAccessList.map(async (stock) => {
            try {
              const data = await api.stocks.getStockData(stock.ticker);
              if (data) {
                return {
                  ...stock,
                  name: data.name || stock.name,
                  price: data.price !== undefined && data.price !== null ? data.price : stock.price,
                  change: data.change_percent !== undefined && data.change_percent !== null ? data.change_percent : stock.change,
                };
              }
            } catch (err) {
              console.warn(`Failed to fetch cached price for ${stock.ticker}:`, err);
            }
            return stock;
          })
        );

        // Check if anything actually changed to avoid unnecessary re-renders
        let hasChanges = false;
        for (let i = 0; i < updatedList.length; i++) {
          if (
            updatedList[i].price !== quickAccessList[i].price ||
            updatedList[i].change !== quickAccessList[i].change ||
            updatedList[i].name !== quickAccessList[i].name
          ) {
            hasChanges = true;
            break;
          }
        }

        if (hasChanges) {
          setQuickAccessList(updatedList);
          localStorage.setItem(userKey, JSON.stringify(updatedList));
        }
      } catch (error) {
        console.error("Failed to fetch initial quick access prices:", error);
      }
    };

    fetchInitialPrices();
  }, []);

  const handleRemoveCompany = (ticker: string) => {
    const updated = quickAccessList.filter(
      (item) => item.ticker.toUpperCase() !== ticker.toUpperCase()
    );
    setQuickAccessList(updated);
    localStorage.setItem(userKey, JSON.stringify(updated));
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch reports list on mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await api.analysis.getReportsList(5, 0);
        if (response && response.reports) {
          const formatted = response.reports.map((r: any) => ({
            id: r.id,
            company: r.company,
            ticker: r.ticker,
            date: new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
            score: r.overall_score,
            summary: r.summary || "Fundamental analysis report.",
            trend: r.overall_score >= 7.5 ? "up" : "down"
          }));
          setReports(formatted);
        }
      } catch (err) {
        console.error("Failed to load dashboard reports:", err);
      } finally {
        setLoadingReports(false);
      }
    };
    fetchReports();
  }, []);

  const [analyzingTicker, setAnalyzingTicker] = useState<string | null>(null);

  const handleAnalyzeStock = async (ticker: string, name: string) => {
    if (analyzingTicker) return;
    setAnalyzingTicker(ticker);
    try {
      const res = await api.analysis.checkReportExists(ticker);
      if (res && res.exists && res.report_id) {
        navigate(`/dashboard/report/${res.report_id}`);
      } else {
        const analysisRes = await api.analysis.analyzeFile(null, name, ticker);
        navigate(`/dashboard/report/${analysisRes.reportId}`);
      }
    } catch (err) {
      console.error("[Dashboard] Error checking or generating report:", err);
      // Fallback in case of failure: go to analyze page
      navigate(`/dashboard/analyze?ticker=${ticker}&name=${encodeURIComponent(name)}`);
    } finally {
      setAnalyzingTicker(null);
    }
  };

  const handleAnalyze = (company: any) => {
    handleAnalyzeStock(company.ticker, company.name);
    setIsSearchFocused(false);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full min-w-0">
        {/* Header — enhanced with time greeting and date */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 sm:mb-10"
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1">
            {getGreeting()}, John
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground flex flex-wrap items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            {getFormattedDate()}
          </p>
        </motion.div>

        {/* Search & Upload — differentiated cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10"
        >
          {/* Search Company — primary CTA with gradient border + glow */}
          <div className="p-4 sm:p-6 rounded-2xl bg-white border border-border shadow-sm gradient-border glow data-card min-w-0">
            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Search className="w-3.5 h-3.5 text-primary" />
              </div>
              Search Company
            </h2>
            <div className="relative" ref={searchRef}>
              {analyzingTicker ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              )}
              <Input
                type="text"
                placeholder="Search by company name or ticker..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                className="pl-10 h-11 bg-secondary/50 border-border rounded-xl focus-visible:ring-primary/20"
                disabled={!!analyzingTicker}
              />
              
              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/80 z-50 max-h-[340px] overflow-y-auto p-2 scrollbar-thin">
                  <CompanySearchResults
                    query={searchQuery}
                    onAnalyze={handleAnalyze}
                    compact={true}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {["RELIANCE", "TCS", "INFY", "HDFCBANK", "AAPL", "MSFT"].map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => {
                    setSearchQuery(ticker);
                    setIsSearchFocused(true);
                  }}
                  className="ticker-chip bg-accent text-primary hover:bg-primary/10"
                >
                  {ticker}
                </button>
              ))}
            </div>
          </div>

          {/* Upload — enhanced drop zone */}
          <div className="p-4 sm:p-6 rounded-2xl bg-white border border-dashed border-border/80 shadow-sm data-card bg-gradient-card min-w-0">
            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Upload className="w-3.5 h-3.5 text-primary" />
              </div>
              Upload Financial Statements
            </h2>
            <div className="border-2 border-dashed border-border rounded-xl p-5 sm:p-8 text-center hover:border-primary/40 transition-all duration-300 cursor-pointer bg-accent/20 hover:bg-accent/40">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 animate-gentle-bounce">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Drag & drop files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground/70">
                Supports PDF, Excel, CSV (max 25MB)
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Reports */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                </div>
                Recent Reports
              </h2>
              <Link to="/dashboard/history">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-sm font-medium gap-1">
                  View All
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="space-y-3">
              {recentReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * index }}
                >
                  <Link
                    to={`/dashboard/report/${report.id}`}
                    className={`block p-4 sm:p-5 pl-5 sm:pl-6 report-card ${report.trend === "up" ? "trend-up" : "trend-down"}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-foreground text-sm truncate">
                            {report.company}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground font-medium">
                            {report.ticker}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {report.date}
                        </p>
                      </div>
                      {/* Score Ring */}
                      <ScoreRing score={report.score} trend={report.trend} />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {report.summary}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Quick Access */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2 className="text-base font-bold text-foreground mb-5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-primary" />
              </div>
              Quick Access
            </h2>

            <div className="rounded-2xl bg-white border border-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto -mx-px">
              <table className="w-full min-w-[320px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">
                      Stock
                    </th>
                    <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-2">
                      Trend
                    </th>
                    <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">
                      Price
                    </th>
                    <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">
                      Change
                    </th>
                    <th className="w-10 py-3 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {watchlist.map((stock) => (
                    <tr
                      key={stock.ticker}
                      className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors duration-200 cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                            {stock.ticker}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {stock.name}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center align-middle">
                        <Sparkline points={stock.sparkline} positive={stock.change >= 0} />
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-foreground tabular-nums">
                        <span className={stock.change >= 0 ? "price-flash-up font-mono" : "price-flash-down font-mono"}>
                          ${stock.price.toFixed(2)}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right text-sm font-semibold tabular-nums ${
                          stock.change >= 0 ? "text-primary" : "text-destructive"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${stock.change >= 0 ? "bg-primary" : "bg-destructive"}`} />
                          {stock.change >= 0 ? "+" : ""}
                          {stock.change.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ) : (
                    quickAccessList.map((stock) => {
                      const live = prices.get(stock.ticker.toUpperCase());
                      const currentPrice = live ? live.price : stock.price;
                      const currentChange = live ? live.change_percent : stock.change;
                      const isINR = stock.ticker.endsWith(".NS") || stock.ticker.endsWith(".BO");
                      const currency = isINR ? "₹" : "$";
                      
                      const isRowAnalyzing = analyzingTicker === stock.ticker;

                      return (
                        <tr
                          key={stock.ticker}
                          onClick={() => handleAnalyzeStock(stock.ticker, stock.name)}
                          className={`border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors cursor-pointer ${
                            isRowAnalyzing ? "opacity-60 pointer-events-none bg-accent/20" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-foreground text-sm">
                                  {stock.ticker}
                                </p>
                                {isRowAnalyzing ? (
                                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                                ) : live ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live" />
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {stock.name}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-medium text-foreground">
                            {currency}{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td
                            className={`py-3 px-4 text-right text-sm font-semibold ${
                              currentChange >= 0 ? "text-primary" : "text-destructive"
                            }`}
                          >
                            {currentChange >= 0 ? "+" : ""}
                            {currentChange.toFixed(2)}%
                          </td>
                          <td className="py-3 pr-4 pl-1 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCompany(stock.ticker);
                              }}
                              className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
