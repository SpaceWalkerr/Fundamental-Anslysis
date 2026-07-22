import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { usePlanStore } from "@/store/usePlanStore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ChatMessage from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { exportReportPdf } from "@/lib/helpers";
import {
  ArrowLeft,
  Download,
  Send,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  FileText,
  DollarSign,
  BarChart3,
  PieChart,
  Sparkles,
  Loader2,
} from "lucide-react";

interface MetricValue {
  score: number;
  label?: string;
  details?: string;
}

interface KeyRatio {
  name: string;
  value: string;
  benchmark: string;
}

interface Report {
  id: string;
  company: string;
  ticker: string;
  exchange: string;
  date: string;
  overall_score: number;
  summary: string;
  plain_english?: string;
  metrics: Record<string, MetricValue>;
  key_ratios: KeyRatio[];
  strengths: string[];
  red_flags: string[];
  investment_assessment: string;
  // Pro-only deeper sections (present when generated on a paid plan)
  personalized_take?: string;
  bull_case?: string[];
  bear_case?: string[];
  what_to_watch?: string[];
  peer_context?: string;
  data_confidence?: { score?: number; note?: string };
}

interface ChatSource {
  document: string;
  page: number;
  excerpt: string;
}

interface UIMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

const WELCOME_MESSAGE: UIMessage = {
  role: "assistant",
  content:
    "I've analyzed this document. Ask me anything about the financials, ratios, or risks and I'll answer from the source material.",
  sources: [],
};

const AnalysisReport = () => {
  const { id } = useParams();
  const { toast } = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);
  const isPro = usePlanStore((s) => s.isPro)();

  const [messages, setMessages] = useState<UIMessage[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch the report and any existing chat history on mount
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const load = async () => {
      setIsLoadingReport(true);
      setReportError(null);
      try {
        const data = await api.analysis.getReport(id);
        if (!cancelled) setReport(data);
      } catch (error) {
        if (!cancelled) {
          setReportError(
            error instanceof Error ? error.message : "Failed to load report."
          );
        }
      } finally {
        if (!cancelled) setIsLoadingReport(false);
      }

      try {
        const history = await api.chat.getChatHistory(id);
        if (!cancelled && Array.isArray(history) && history.length > 0) {
          setMessages([
            WELCOME_MESSAGE,
            ...history.map((m: any) => ({
              role: m.role,
              content: m.content,
              sources: m.sources || [],
            })),
          ]);
        }
      } catch {
        // No history yet — keep the welcome message
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const formattedDate = report?.date
    ? new Date(report.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const handleExportPDF = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      // Pro-gated inside the shared helper (free users get the upgrade modal).
      const result = await exportReportPdf(report);
      if (result === "ok") {
        toast({
          title: "PDF Exported",
          description: "Your analysis report has been downloaded successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description:
          error instanceof Error ? error.message : "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isSending || !id) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInputValue("");
    setIsSending(true);

    try {
      const resp = await api.chat.sendMessage(id, text);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: resp.message, sources: resp.sources },
      ]);
    } catch (error) {
      toast({
        title: "Chat error",
        description:
          error instanceof Error ? error.message : "Failed to get a response.",
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't answer that right now. Please try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoadingReport) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-2rem)] gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Loading report…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (reportError || !report) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-2rem)] gap-4 text-center px-6">
          <AlertTriangle className="w-10 h-10 text-warning" />
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Couldn't load this report
            </h2>
            <p className="text-sm text-muted-foreground">
              {reportError || "The report may still be processing or was not found."}
            </p>
          </div>
          <Link to="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-2rem)] m-4 gap-4">
        {/* Report Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 rounded-2xl bg-white border border-border overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="gap-2 bg-primary text-white hover:bg-primary/90"
                  onClick={handleExportPDF}
                  disabled={isExporting}
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? "Exporting..." : "Export PDF"}
                </Button>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground">
                    {report.company}
                  </h1>
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary text-sm font-medium">
                    {report.ticker}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {report.exchange}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Analysis generated on {formattedDate}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">
                  Overall Score
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-3xl font-bold text-primary">
                    {report.overall_score}/10
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              {/* The verdict — one line anyone can grasp instantly */}
              {report.plain_english && (
                <section className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">The bottom line</p>
                    <p className="text-foreground font-medium leading-relaxed">{report.plain_english}</p>
                  </div>
                </section>
              )}

              {/* Executive Summary */}
              <section>
                <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Executive Summary
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {report.summary}
                </p>
              </section>

              {/* Personalized take (Pro) */}
              {report.personalized_take && (
                <section className="p-5 rounded-xl bg-secondary/40 border border-border">
                  <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Written for how you invest
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">{report.personalized_take}</p>
                </section>
              )}

              {/* Score Cards */}
              <section>
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Financial Health Scores
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(report.metrics || {}).map(([key, value]) => (
                    <div
                      key={key}
                      className="p-4 rounded-lg bg-secondary/50 border border-border"
                    >
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {key}
                      </p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-foreground">
                          {value.score}
                        </span>
                        <span className="text-sm text-muted-foreground mb-1">
                          /10
                        </span>
                      </div>
                      <div
                        className={`text-xs font-medium mt-1 ${
                          value.score >= 8
                            ? "text-success"
                            : value.score >= 6
                            ? "text-warning"
                            : "text-destructive"
                        }`}
                      >
                        {value.label}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Key Ratios */}
              <section>
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  Key Financial Ratios
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(report.key_ratios || []).map((ratio, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-secondary/50 border border-border"
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {ratio.name}
                      </p>
                      <p className="text-xl font-bold text-foreground mb-1">
                        {ratio.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ratio.benchmark}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Strengths & Red Flags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Strengths
                  </h2>
                  <ul className="space-y-3">
                    {(report.strengths || []).map((strength, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm text-muted-foreground"
                      >
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Red Flags & Concerns
                  </h2>
                  <ul className="space-y-3">
                    {(report.red_flags || []).map((flag, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm text-muted-foreground"
                      >
                        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* Bull vs Bear (Pro) */}
              {(report.bull_case?.length || report.bear_case?.length) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.bull_case?.length ? (
                    <section className="p-5 rounded-xl bg-success/5 border border-success/20">
                      <h2 className="text-base font-bold text-foreground mb-3">🐂 Bull case</h2>
                      <ul className="space-y-2">
                        {report.bull_case.map((b, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-success font-bold">+</span> {b}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {report.bear_case?.length ? (
                    <section className="p-5 rounded-xl bg-destructive/5 border border-destructive/20">
                      <h2 className="text-base font-bold text-foreground mb-3">🐻 Bear case</h2>
                      <ul className="space-y-2">
                        {report.bear_case.map((b, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-destructive font-bold">−</span> {b}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              )}

              {/* What to watch (Pro) */}
              {report.what_to_watch?.length ? (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    What to watch next quarter
                  </h2>
                  <ul className="space-y-2">
                    {report.what_to_watch.map((w, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {/* Pro upsell teaser — shown when the report has no deep sections (free plan) */}
              {!isPro && !report.bull_case?.length && (
                <section
                  className="p-5 rounded-xl border border-dashed border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => usePlanStore.getState().openUpgrade("general")}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">Unlock the full analyst view with Pro</span>
                    <span className="ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded bg-gradient-to-br from-amber-500 to-amber-600 text-white">PRO</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A personalised take written for how <em>you</em> invest, a full bull vs bear breakdown, what to watch next quarter, and one-click PDF export. <span className="text-primary font-semibold">Upgrade →</span>
                  </p>
                </section>
              )}

              {/* Investment Assessment */}
              <section>
                <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Investment Assessment
                </h2>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {report.investment_assessment}
                  </p>
                </div>
              </section>

              {/* Disclaimer */}
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Disclaimer:</strong> This analysis is for educational
                  purposes only and does not constitute financial advice. Past
                  performance is not indicative of future results. Always conduct
                  your own research before making investment decisions.
                </p>
              </div>
            </div>
          </ScrollArea>
        </motion.div>

        {/* Q&A Chat Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full lg:w-96 rounded-2xl bg-white border border-border overflow-hidden flex flex-col"
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Ask Questions
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Get instant answers about this analysis
            </p>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  sources={message.sources}
                />
              ))}
              {isSending && (
                <ChatMessage role="assistant" content="" sources={[]} isLoading />
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about the analysis..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={isSending}
                className="flex-1 bg-secondary border-border"
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={isSending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {["Why is debt high?", "Revenue breakdown?", "Compare to peers"].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputValue(suggestion)}
                    className="px-3 py-1 rounded-full bg-secondary text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default AnalysisReport;
