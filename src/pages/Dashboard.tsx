import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CompanySearchResults from "@/components/CompanySearchResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  const handleAnalyze = (company: any) => {
    navigate(`/dashboard/report/1`); // Using the mock report ID 1 for now
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
              {["AAPL", "MSFT", "GOOGL", "AMZN"].map((ticker) => (
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
                  ))}
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
