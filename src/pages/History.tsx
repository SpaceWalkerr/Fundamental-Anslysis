import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import {
  Search,
  Clock,
  TrendingUp,
  TrendingDown,
  Download,
  Trash2,
  Filter,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Report {
  id: string;
  company: string;
  ticker: string;
  date: string;
  score: number;
  trend: "up" | "down";
  status: string;
}

const History = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.analysis.getReportsList(100, 0);
      if (response && response.reports) {
        const mapped = response.reports.map((r: any) => ({
          id: r.id,
          company: r.company,
          ticker: r.ticker,
          date: new Date(r.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          score: r.overall_score || 0,
          trend: (r.overall_score || 0) >= 7.5 ? ("up" as const) : ("down" as const),
          status: r.status,
        }));
        setAllReports(mapped);
        
        // Apply search query if present
        if (searchQuery.trim() === "") {
          setFilteredReports(mapped);
        } else {
          setFilteredReports(
            mapped.filter(
              (r: Report) =>
                r.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.ticker.toLowerCase().includes(searchQuery.toLowerCase())
            )
          );
        }
      }
    } catch (err: any) {
      console.error("Error fetching reports:", err);
      setError("Failed to load your analysis history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredReports(allReports);
    } else {
      setFilteredReports(
        allReports.filter(
          (r) =>
            r.company.toLowerCase().includes(query.toLowerCase()) ||
            r.ticker.toLowerCase().includes(query.toLowerCase())
        )
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report? This will also delete the chat Q&A history associated with it.")) {
      return;
    }
    try {
      await api.analysis.deleteReport(id);
      const updated = allReports.filter((r) => r.id !== id);
      setAllReports(updated);
      setFilteredReports(
        updated.filter(
          (r) =>
            r.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.ticker.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } catch (err: any) {
      console.error("Error deleting report:", err);
      alert(err.message || "Failed to delete the report. Please try again.");
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
          <h1 className="text-3xl font-bold text-foreground mb-2">
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
              className="pl-10 bg-white border-border"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading your analysis history...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-border p-8">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Error Loading History
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchReports} className="bg-primary text-white">
              Try Again
            </Button>
          </div>
        ) : (
          /* Reports Grid */
          <>
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
                  className="group p-5 rounded-2xl bg-white border border-border hover:border-primary/50 transition-all duration-300 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                          {report.company}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-accent/30 text-xs text-primary font-medium">
                            {report.ticker || "PDF UPLOAD"}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {report.date}
                          </span>
                        </div>
                      </div>
                      
                      {report.status === "completed" ? (
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
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                          report.status === "failed" 
                            ? "bg-destructive/10 text-destructive"
                            : "bg-secondary text-muted-foreground animate-pulse"
                        }`}>
                          {report.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    {report.status === "completed" ? (
                      <Link to={`/dashboard/report/${report.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          View Report
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full flex-1" disabled>
                        Processing...
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleDelete(report.id)}
                    >
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default History;

