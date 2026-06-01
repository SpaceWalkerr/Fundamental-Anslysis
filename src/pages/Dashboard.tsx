import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CompanySearchResults from "@/components/CompanySearchResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/useAuthStore";
import {
  ArrowRight,
  Clock,
  FileText,
  Plus,
  Search,
  Upload,
} from "lucide-react";

const recentReports = [
  {
    id: 1,
    company: "Reliance Industries Ltd.",
    ticker: "RELIANCE",
    date: "29 May 2026",
    score: 8.4,
    summary: "Diversified cash flows across energy, retail and telecom with strong market leadership.",
  },
  {
    id: 2,
    company: "Tata Consultancy Services Ltd.",
    ticker: "TCS",
    date: "28 May 2026",
    score: 7.8,
    summary: "High quality IT services franchise with resilient margins and strong capital returns.",
  },
  {
    id: 3,
    company: "HDFC Bank Ltd.",
    ticker: "HDFCBANK",
    date: "27 May 2026",
    score: 6.9,
    summary: "Scale advantage remains intact while deposit growth and merger integration need monitoring.",
  },
  {
    id: 4,
    company: "Titan Company Ltd.",
    ticker: "TITAN",
    date: "26 May 2026",
    score: 5.8,
    summary: "Premium consumer franchise, but valuation leaves little room for execution misses.",
  },
];

const watchlist = [
  { ticker: "RELIANCE", name: "Reliance", price: 2918.4, change: 1.02 },
  { ticker: "TCS", name: "TCS", price: 3842.2, change: -0.47 },
  { ticker: "INFY", name: "Infosys", price: 1488.6, change: 0.91 },
  { ticker: "HDFCBANK", name: "HDFC Bank", price: 1537.8, change: -0.4 },
  { ticker: "SBIN", name: "SBI", price: 817.4, change: 0.89 },
];

const scoreClass = (score: number) => {
  if (score >= 8) return "bg-profit-soft text-profit border-[color-mix(in_srgb,var(--profit-token)_30%,transparent)]";
  if (score >= 6) return "bg-warning-soft text-warning-token border-[color-mix(in_srgb,var(--warning-token)_30%,transparent)]";
  return "bg-loss-soft text-loss border-[color-mix(in_srgb,var(--loss-token)_30%,transparent)]";
};

const formatINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAnalyze = () => {
    navigate("/dashboard/report/1");
    setIsSearchFocused(false);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-7"
        >
          <h1 className="mb-2 text-2xl font-semibold text-[var(--text-primary-token)]">
            Welcome back, {user?.name?.split(" ")[0] || "Investor"}
          </h1>
          <p className="text-sm text-[var(--text-muted-token)]">
            Precision-grade fundamental analysis for Indian equities.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-[7fr_5fr]"
        >
          <section className="card-institutional">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary-token)]">
              <Search className="h-4 w-4 text-[var(--accent-token)]" />
              Search Company
            </h2>

            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted-token)]" />
              <Input
                type="text"
                placeholder="Search NSE/BSE company or symbol..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                className="h-12 rounded-lg border-[var(--border-token)] bg-[var(--bg-primary)] pl-10 font-market text-[var(--text-primary-token)] placeholder:text-[var(--text-muted-token)] focus-visible:ring-[var(--accent-token)]"
              />

              {isSearchFocused && searchQuery.length > 0 && (
                <div className="app-shell absolute left-0 right-0 top-full z-50 mt-2 max-h-[430px] overflow-y-auto rounded-lg border border-[var(--border-token)] bg-[var(--bg-surface)] shadow-2xl">
                  <div className="p-2">
                    <CompanySearchResults query={searchQuery} onAnalyze={handleAnalyze} />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN"].map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => {
                    setSearchQuery(ticker);
                    setIsSearchFocused(true);
                  }}
                  className="rounded-full border border-[var(--border-token)] px-3 py-1.5 font-market text-xs text-[var(--text-muted-token)] hover:border-[var(--accent-token)] hover:text-[var(--text-primary-token)]"
                >
                  {ticker}
                </button>
              ))}
            </div>
          </section>

          <section className="card-institutional">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary-token)]">
              <Upload className="h-4 w-4 text-[var(--accent-token)]" />
              Upload Financial Statements
            </h2>

            <div className="rounded-lg border border-dashed border-[var(--border-token)] bg-[var(--bg-primary)] p-8 text-center hover:border-[var(--accent-token)]">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-token)_12%,transparent)]">
                <Plus className="h-5 w-5 text-[var(--accent-token)]" />
              </div>
              <p className="mb-1 text-sm text-[var(--text-primary-token)]">
                Drag and drop files here or click to browse
              </p>
              <p className="text-xs text-[var(--text-muted-token)]">
                PDF, Excel, CSV supported. Max 25MB.
              </p>
            </div>
          </section>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary-token)]">
                <Clock className="h-4 w-4 text-[var(--accent-token)]" />
                Recent Reports
              </h2>
              <Link to="/dashboard/history">
                <Button variant="ghost" size="sm" className="gap-1 text-[var(--accent-token)] hover:bg-[color-mix(in_srgb,var(--accent-token)_10%,transparent)] hover:text-[var(--accent-hover)]">
                  View All
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--border-token)] bg-[var(--bg-surface)]">
              <table className="w-full">
                <thead className="bg-[var(--bg-card)]">
                  <tr>
                    {["Company", "Ticker", "Score", "Date", "Summary"].map((heading) => (
                      <th key={heading} className="border-b border-[var(--border-token)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted-token)]">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report) => (
                    <tr key={report.id} className="border-b border-[var(--border-token)] last:border-0 hover:bg-[var(--bg-card)]">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary-token)]">{report.company}</td>
                      <td className="px-4 py-3 font-market text-sm text-[var(--text-muted-token)]">{report.ticker}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 font-market text-xs font-semibold ${scoreClass(report.score)}`}>
                          {report.score.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-market text-xs text-[var(--text-muted-token)]">{report.date}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-muted-token)]">{report.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary-token)]">
              <FileText className="h-4 w-4 text-[var(--accent-token)]" />
              Quick Access
            </h2>

            <div className="overflow-hidden rounded-xl border border-[var(--border-token)] bg-[var(--bg-surface)]">
              <table className="w-full">
                <thead className="bg-[var(--bg-card)]">
                  <tr>
                    <th className="border-b border-[var(--border-token)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted-token)]">Stock</th>
                    <th className="border-b border-[var(--border-token)] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted-token)]">Price</th>
                    <th className="border-b border-[var(--border-token)] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted-token)]">Chg</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlist.map((stock) => (
                    <tr key={stock.ticker} className="border-b border-[var(--border-token)] last:border-0 hover:bg-[var(--bg-card)]">
                      <td className="px-4 py-3">
                        <p className="font-market text-sm font-semibold text-[var(--text-primary-token)]">{stock.ticker}</p>
                        <p className="text-xs text-[var(--text-muted-token)]">{stock.name}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-market text-sm text-[var(--text-primary-token)]">
                        {formatINR(stock.price)}
                      </td>
                      <td className={`px-4 py-3 text-right font-market text-sm font-semibold ${stock.change >= 0 ? "text-profit" : "text-loss"}`}>
                        {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
