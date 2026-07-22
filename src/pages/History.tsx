import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Clock,
  TrendingUp,
  TrendingDown,
  Download,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { exportReportPdf } from "@/lib/helpers";

interface ReportItem {
  id: string;
  company: string;
  ticker: string;
  overall_score: number;
  created_at: string;
  status: string;
}

type SortKey = "newest" | "oldest" | "score";
const PAGE_SIZE = 24;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const History = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ReportItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadReports = async (offset: number) => {
    try {
      const data = await api.analysis.getReportsList(PAGE_SIZE, offset);
      const incoming: ReportItem[] = data.reports || [];
      setTotal(data.total || 0);
      setReports((prev) => (offset === 0 ? incoming : [...prev, ...incoming]));
      setError(null);
    } catch (e) {
      if (offset === 0) setError("We couldn't load your reports. Please try again.");
      else toast.error("Failed to load more reports");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadReports(0);
      setLoading(false);
    })();
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadReports(reports.length);
    setLoadingMore(false);
  };

  // Client-side search + sort over the reports already loaded.
  const visibleReports = useMemo(() => {
    let list = reports;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.company.toLowerCase().includes(q) || r.ticker.toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sort === "newest") {
      sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    } else if (sort === "oldest") {
      sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    } else {
      sorted.sort((a, b) => b.overall_score - a.overall_score);
    }
    return sorted;
  }, [reports, searchQuery, sort]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setIsDeleting(true);
    // Optimistic removal.
    setReports((prev) => prev.filter((r) => r.id !== target.id));
    setTotal((t) => Math.max(0, t - 1));
    try {
      await api.analysis.deleteReport(target.id);
      toast.success("Report deleted");
    } catch (e) {
      // Restore on failure.
      setReports((prev) => [target, ...prev]);
      setTotal((t) => t + 1);
      toast.error("Couldn't delete the report. Please try again.");
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  const handleDownload = async (report: ReportItem) => {
    setExportingId(report.id);
    try {
      const full = await api.analysis.getReport(report.id);
      const result = await exportReportPdf({
        ticker: full.ticker ?? report.ticker,
        company: full.company ?? report.company,
        overall_score: full.overall_score ?? report.overall_score,
        summary: full.summary,
        strengths: full.strengths,
        red_flags: full.red_flags,
        investment_assessment: full.investment_assessment,
      });
      if (result === "ok") toast.success("PDF downloaded");
    } catch (e) {
      toast.error("Couldn't export this report. Please try again.");
    } finally {
      setExportingId(null);
    }
  };

  const scoreChip = (score: number) => {
    const s = score.toFixed(1);
    if (score >= 7) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-success/10 text-success">
          <TrendingUp className="w-4 h-4" />
          <span className="font-semibold text-sm">{s}/10</span>
        </div>
      );
    }
    if (score >= 5) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-700">
          <span className="font-semibold text-sm">{s}/10</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded bg-destructive/10 text-destructive">
        <TrendingDown className="w-4 h-4" />
        <span className="font-semibold text-sm">{s}/10</span>
      </div>
    );
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Report History</h1>
          <p className="text-muted-foreground">Access all your past analysis reports</p>
        </motion.div>

        {/* Search & Sort */}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-border"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-full sm:w-48 bg-white border-border">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="score">Highest score</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white border border-border shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-7 w-16 rounded" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-16 bg-white rounded-2xl border border-border">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button
              onClick={async () => {
                setLoading(true);
                await loadReports(0);
                setLoading(false);
              }}
              className="bg-primary text-white hover:bg-primary/90"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Empty (no reports at all) */}
        {!loading && !error && total === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-border">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No reports yet</h3>
            <p className="text-muted-foreground mb-5">
              Analyze your first company and it'll show up here.
            </p>
            <Link to="/dashboard/analyze">
              <Button className="bg-primary text-white hover:bg-primary/90">
                Create your first analysis
              </Button>
            </Link>
          </div>
        )}

        {/* Reports grid */}
        {!loading && !error && total > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleReports.map((report, index) => {
                const isProcessing =
                  report.status === "processing" || report.status === "pending";
                const isFailed = report.status === "failed";
                const isExporting = exportingId === report.id;
                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(0.05 * index, 0.4) }}
                    className="group p-5 rounded-2xl bg-white border border-border hover:border-primary/50 transition-all duration-300 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{report.company}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-accent/30 text-xs text-primary font-medium">
                            {report.ticker}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(report.created_at)}
                          </span>
                        </div>
                      </div>
                      {isProcessing ? (
                        <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-semibold animate-pulse">
                          Processing…
                        </span>
                      ) : isFailed ? (
                        <span className="px-2 py-1 rounded bg-destructive/10 text-destructive text-xs font-semibold">
                          Failed
                        </span>
                      ) : (
                        scoreChip(report.overall_score)
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isFailed ? (
                        <div className="flex-1 text-xs text-muted-foreground">
                          Analysis didn't complete.
                        </div>
                      ) : (
                        <Link
                          to={isProcessing ? "#" : `/dashboard/report/${report.id}`}
                          className={`flex-1 ${isProcessing ? "pointer-events-none" : ""}`}
                          tabIndex={isProcessing ? -1 : 0}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled={isProcessing}
                          >
                            View Report
                          </Button>
                        </Link>
                      )}
                      {!isFailed && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          disabled={isProcessing || isExporting}
                          onClick={() => handleDownload(report)}
                          title="Download PDF"
                        >
                          {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Download className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setPendingDelete(report)}
                        title="Delete report"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* No search matches */}
            {visibleReports.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No reports found</h3>
                <p className="text-muted-foreground">
                  Try a different search term or create a new analysis
                </p>
              </div>
            )}

            {/* Load more */}
            {!searchQuery && reports.length < total && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="gap-2"
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingMore ? "Loading…" : `Load more (${total - reports.length})`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.company}" (${pendingDelete.ticker}) will be permanently removed. This can't be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default History;
