import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Clock, TrendingUp, TrendingDown, Download, Trash2, Filter, FileText,
} from "lucide-react";

const reports = [
  { id: 1, company: "Apple Inc.", ticker: "AAPL", date: "Jan 28, 2026", score: 8.5, trend: "up" },
  { id: 2, company: "Microsoft Corporation", ticker: "MSFT", date: "Jan 25, 2026", score: 9.1, trend: "up" },
  { id: 3, company: "Tesla Inc.", ticker: "TSLA", date: "Jan 20, 2026", score: 6.2, trend: "down" },
  { id: 4, company: "NVIDIA Corporation", ticker: "NVDA", date: "Jan 15, 2026", score: 8.8, trend: "up" },
  { id: 5, company: "Amazon.com Inc.", ticker: "AMZN", date: "Jan 10, 2026", score: 7.5, trend: "up" },
  { id: 6, company: "Alphabet Inc.", ticker: "GOOGL", date: "Jan 5, 2026", score: 8.2, trend: "up" },
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <h1 className="font-bold mb-2" style={{ fontSize: 28, color: "#111625" }}>Report History</h1>
          <p style={{ fontSize: 14, color: "#64748B" }}>Access all your past analysis reports</p>
        </motion.div>

        {/* Search & Filter */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#64748B" }} />
            <Input
              type="text"
              placeholder="Search by company name or ticker..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-white h-11 text-sm transition-all"
              style={{ borderRadius: 8, borderColor: "#E2E8F0" }}
            />
          </div>
          <Button variant="outline" className="gap-2 hover:border-[#00AA5B] hover:text-[#00AA5B] transition-colors" style={{ borderRadius: 8, borderColor: "#E2E8F0", color: "#4B5563" }}>
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </motion.div>

        {/* Reports Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 16 }}>
          {filteredReports.map((report, index) => {
            const isGood = report.score >= 7;
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                className="group bg-white border transition-all duration-300 hover:-translate-y-0.5"
                style={{ borderRadius: 12, padding: 20, borderColor: "#E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 22px rgba(15,23,42,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate mb-2" style={{ fontSize: 16, color: "#111625" }}>{report.company}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: "#E1F7EC", color: "#00AA5B", borderRadius: 999 }}>{report.ticker}</span>
                      <span className="flex items-center gap-1" style={{ fontSize: 12, color: "#64748B" }}>
                        <Clock className="w-3 h-3" />{report.date}
                      </span>
                    </div>
                  </div>
                  {/* Score Badge */}
                  <div className="flex items-center gap-1 px-2.5 py-1 font-bold" style={{ borderRadius: 999, fontSize: 13, backgroundColor: isGood ? "#E1F7EC" : "#FEF2F2", color: isGood ? "#00AA5B" : "#DC2626" }}>
                    {report.trend === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {report.score}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Link to={`/dashboard/report/${report.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full font-medium text-[#00AA5B] border-[#00AA5B] hover:bg-[#00AA5B] hover:text-white transition-colors" style={{ borderRadius: 8, fontSize: 13 }}>
                      View Report
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-[#F0FDF4] hover:text-[#00AA5B] transition-colors" style={{ borderRadius: 8, color: "#64748B" }}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors" style={{ borderRadius: 8, color: "#64748B" }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {filteredReports.length === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "#F0FDF4", borderRadius: 12 }}>
              <FileText className="w-8 h-8" style={{ color: "#00AA5B" }} />
            </div>
            <h3 className="font-semibold mb-2" style={{ fontSize: 18, color: "#111625" }}>No reports found</h3>
            <p style={{ fontSize: 14, color: "#64748B" }}>Try a different search term or create a new analysis</p>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default History;
