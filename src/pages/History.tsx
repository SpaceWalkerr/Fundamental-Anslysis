import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Clock,
  TrendingUp,
  TrendingDown,
  Download,
  Trash2,
  Filter,
} from "lucide-react";

const reports = [
  {
    id: 1,
    company: "Apple Inc.",
    ticker: "AAPL",
    date: "Jan 28, 2026",
    score: 8.5,
    trend: "up",
  },
  {
    id: 2,
    company: "Microsoft Corporation",
    ticker: "MSFT",
    date: "Jan 25, 2026",
    score: 9.1,
    trend: "up",
  },
  {
    id: 3,
    company: "Tesla Inc.",
    ticker: "TSLA",
    date: "Jan 20, 2026",
    score: 6.2,
    trend: "down",
  },
  {
    id: 4,
    company: "NVIDIA Corporation",
    ticker: "NVDA",
    date: "Jan 15, 2026",
    score: 8.8,
    trend: "up",
  },
  {
    id: 5,
    company: "Amazon.com Inc.",
    ticker: "AMZN",
    date: "Jan 10, 2026",
    score: 7.5,
    trend: "up",
  },
  {
    id: 6,
    company: "Alphabet Inc.",
    ticker: "GOOGL",
    date: "Jan 5, 2026",
    score: 8.2,
    trend: "up",
  },
];

const History = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredReports, setFilteredReports] = useState(reports);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredReports(reports);
    } else {
      setFilteredReports(
        reports.filter(
          (r) =>
            r.company.toLowerCase().includes(query.toLowerCase()) ||
            r.ticker.toLowerCase().includes(query.toLowerCase())
        )
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-serif font-semibold text-foreground mb-2">
            Report History
          </h1>
          <p className="text-muted-foreground">
            Access all your past analysis reports
          </p>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </motion.div>

        {/* Reports Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredReports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              className="group p-5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 data-card"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {report.company}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-secondary text-xs text-muted-foreground">
                      {report.ticker}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {report.date}
                    </span>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded ${
                    report.trend === "up"
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {report.trend === "up" ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="font-semibold text-sm">{report.score}/10</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link to={`/dashboard/report/${report.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    View Report
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Download className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No reports found
            </h3>
            <p className="text-muted-foreground">
              Try a different search term or create a new analysis
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default History;
