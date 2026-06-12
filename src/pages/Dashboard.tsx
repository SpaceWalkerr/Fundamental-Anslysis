import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CompanySearchResults from "@/components/CompanySearchResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
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
  { ticker: "AAPL", name: "Apple", price: 225.50, change: 2.35 },
  { ticker: "MSFT", name: "Microsoft", price: 415.25, change: 1.82 },
  { ticker: "GOOGL", name: "Alphabet", price: 178.90, change: -0.54 },
  { ticker: "NVDA", name: "NVIDIA", price: 880.25, change: 5.12 },
];

const Dashboard = () => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
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

  const handleAnalyze = (company: any) => {
    navigate(`/dashboard/analyze?ticker=${company.ticker}&name=${encodeURIComponent(company.name)}`);
    setIsSearchFocused(false);
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            Welcome back, {user?.name || "User"}
          </h1>
          <p className="text-muted-foreground">
            Ready to analyze some financials?
          </p>
        </motion.div>

        {/* Search & Upload — clean white cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          {/* Search Company */}
          <div className="p-6 rounded-2xl bg-white border border-border shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
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
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-md shadow-lg border border-border z-50 max-h-[400px] overflow-y-auto">
                  <div className="p-2">
                    <CompanySearchResults
                      query={searchQuery}
                      onAnalyze={handleAnalyze}
                    />
                  </div>
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
                  className="px-3 py-1.5 rounded-full bg-accent text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  {ticker}
                </button>
              ))}
            </div>
          </div>

          {/* Upload */}
          <div className="p-6 rounded-2xl bg-white border border-dashed border-border shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Upload Financial Statements
            </h2>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer bg-accent/30">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                Drag & drop files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground/70">
                Supports PDF, Excel, CSV (max 25MB)
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Reports */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
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
              {loadingReports ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-border">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto text-primary"></div>
                  <p className="mt-4 text-xs text-muted-foreground">Loading recent reports...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-border">
                  <p className="text-muted-foreground text-sm mb-4">No reports generated yet.</p>
                  <Link to="/dashboard/analyze">
                    <Button size="sm" className="bg-primary text-white hover:bg-primary/90">Create Your First Analysis</Button>
                  </Link>
                </div>
              ) : (
                reports.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * index }}
                  >
                    <Link
                      to={`/dashboard/report/${report.id}`}
                      className="block p-5 rounded-2xl bg-white border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-foreground text-sm">
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
                        <div
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            report.trend === "up"
                              ? "bg-primary/10 text-primary"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {report.trend === "up" ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          {report.score}/10
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {report.summary}
                      </p>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Quick Access */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Quick Access
            </h2>

            <div className="rounded-2xl bg-white border border-border overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">
                      Stock
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
                      className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            {stock.ticker}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {stock.name}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-foreground">
                        ${stock.price.toFixed(2)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right text-sm font-semibold ${
                          stock.change >= 0 ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {stock.change >= 0 ? "+" : ""}
                        {stock.change.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
