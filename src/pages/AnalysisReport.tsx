import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ChatMessage from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { api, downloadBlob } from "@/lib/api";
import {
  ArrowLeft,
  Download,
  Share2,
  Send,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  FileText,
  DollarSign,
  BarChart3,
  PieChart,
  Loader2,
} from "lucide-react";

// Mock report data
const reportData = {
  id: 1,
  company: "Apple Inc.",
  ticker: "AAPL",
  exchange: "NASDAQ",
  date: "January 28, 2026",
  overallScore: 8.5,
  summary:
    "Apple demonstrates exceptional financial strength with industry-leading profitability metrics and robust cash flow generation. The company maintains a fortress balance sheet while returning significant capital to shareholders. Premium valuation is warranted by ecosystem strength and services growth momentum.",
  metrics: {
    profitability: { score: 9.2, label: "Excellent" },
    liquidity: { score: 7.8, label: "Good" },
    solvency: { score: 8.5, label: "Strong" },
    efficiency: { score: 8.9, label: "Excellent" },
  },
  keyRatios: [
    { name: "P/E Ratio", value: "28.5x", benchmark: "Industry: 25.2x" },
    { name: "ROE", value: "89.6%", benchmark: "Industry: 18.4%" },
    { name: "Gross Margin", value: "46.2%", benchmark: "Industry: 42.1%" },
    { name: "Current Ratio", value: "1.08", benchmark: "Industry: 1.35" },
    { name: "Debt/Equity", value: "1.98", benchmark: "Industry: 0.85" },
    { name: "Operating Margin", value: "31.5%", benchmark: "Industry: 22.3%" },
  ],
  strengths: [
    "Exceptional brand value and customer loyalty",
    "Dominant ecosystem with high switching costs",
    "Services segment growing at 15%+ annually",
    "Strong free cash flow generation ($100B+ annually)",
    "Proven pricing power across product lines",
  ],
  redFlags: [
    "High debt levels relative to historical norms",
    "Slowing iPhone growth in mature markets",
    "Regulatory scrutiny on App Store practices",
    "Geographic concentration risk in China",
  ],
  investmentAssessment:
    "Apple represents a quality holding for long-term investors seeking exposure to a dominant technology franchise. While the valuation appears premium relative to near-term earnings growth, the company's ecosystem strength, services momentum, and capital return program support the current multiple. Suitable for growth-oriented and dividend-growth investors with a 3-5 year horizon.",
};

const chatMessages = [
  {
    role: "assistant",
    content:
      "I've analyzed the financial statements. Feel free to ask me any questions about the analysis!",
    sources: [],
  },
];
const AnalysisReport = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.analysis.getReport(id);
        setReport(data);
        
        // Fetch chat history
        try {
          const history = await api.chat.getChatHistory(id);
          if (history && history.length > 0) {
            setMessages(history.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
              sources: msg.sources || []
            })));
          } else {
            setMessages([
              {
                role: "assistant",
                content: `I've analyzed ${data.company}'s financial data. Feel free to ask me any questions about the analysis!`,
                sources: [],
              }
            ]);
          }
        } catch (historyErr) {
          console.error("Failed to load chat history:", historyErr);
          setMessages([
            {
              role: "assistant",
              content: `I've analyzed ${data.company}'s financial data. Feel free to ask me any questions about the analysis!`,
              sources: [],
            }
          ]);
        }
      } catch (err: any) {
        console.error("Error loading report:", err);
        setError(err.message || "Failed to load report");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  const handleExportPDF = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      // Find pe_ratio and roe from key ratios
      const peRatioVal = parseFloat(report.key_ratios.find((r: any) => r.name.toLowerCase().includes("p/e"))?.value || "0");
      const roeVal = parseFloat(report.key_ratios.find((r: any) => r.name.toLowerCase() === "roe")?.value || "0");
      const profitMarginVal = parseFloat(report.key_ratios.find((r: any) => r.name.toLowerCase().includes("profit margin"))?.value || "0");

      // Prepare analysis data for PDF
      const analysisData = {
        ticker: report.ticker,
        company_name: report.company,
        current_price: 0.0,
        recommendation: report.overall_score >= 8 ? "BUY" : report.overall_score >= 6 ? "HOLD" : "SELL",
        score: report.overall_score * 10,
        metrics: {
          pe_ratio: peRatioVal,
          eps: 0.0,
          market_cap: "N/A",
          revenue_growth: report.metrics?.efficiency?.score * 10 || 0,
          profit_margin: profitMarginVal,
          roe: roeVal,
        },
        valuation: {
          fair_value: 0.0,
          upside_potential: 0.0,
          valuation_rating: report.overall_score >= 8 ? "Undervalued" : "Fair Value",
        },
        strengths: report.strengths,
        weaknesses: report.red_flags,
        ai_summary: report.summary,
        ai_recommendation: report.investment_assessment,
        risk_level: report.red_flags.length > 4 ? "High" : "Medium",
        risk_factors: report.red_flags,
      };

      // Call PDF export API
      const blob = await api.pdf.exportAnalysis(report.ticker, analysisData);
      downloadBlob(blob, `analysis_${report.ticker}.pdf`);
      
      toast({
        title: "PDF Exported",
        description: "Your analysis report has been downloaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !id || isSending) return;

    const userMessage = inputValue;
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage, sources: [] }]);
    setIsSending(true);

    try {
     const response = await api.chat.sendMessage(id, userMessage);

let respContent = "No response received";
      if (typeof response === "string") {
        respContent = response;
      } else if (response && typeof response === "object") {
        if ('content' in response && typeof (response as any).content === 'string') {
          respContent = (response as any).content;
        } else if ('answer' in response && typeof (response as any).answer === 'string') {
          respContent = (response as any).answer;
        } else if ('message' in response) {
          const msg = (response as any).message;
          if (typeof msg === 'string') respContent = msg;
          else if (msg && typeof msg === 'object' && 'content' in msg && typeof msg.content === 'string') respContent = msg.content;
        }
      }

      const rawSources: any[] = [];
      if (response && typeof response === 'object') {
        if ('sources' in response && Array.isArray((response as any).sources)) rawSources.push(...(response as any).sources);
        else if ('message' in response && (response as any).message && Array.isArray((response as any).message.sources)) rawSources.push(...(response as any).message.sources);
      }

      const respSources = rawSources.map((src: any) => ({
        document: src?.document || "Source Document",
        page: src?.page || 1,
        excerpt: src?.excerpt || "",
      }));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: respContent,
          sources: respSources,
        },
      ]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err.message || "Failed to get AI response. Please try again.",
          sources: [],
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading analysis report...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !report) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[80vh] p-4">
          <div className="text-center max-w-md bg-white border border-border p-6 rounded-2xl">
            <div className="text-destructive font-semibold mb-3">Error Loading Report</div>
            <p className="text-muted-foreground mb-6">{error || "Report details not found."}</p>
            <Link to="/dashboard">
              <Button className="bg-primary text-white hover:bg-primary/90">
                Go to Dashboard
              </Button>
            </Link>
          </div>
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
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
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
                  Analysis generated on {new Date(report.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
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

              {/* Score Cards */}
              <section>
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Financial Health Scores
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(report.metrics).map(([key, value]: [string, any]) => (
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
                  {report.key_ratios.map((ratio: any, index: number) => (
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
                    {report.strengths.map((strength: string, index: number) => (
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
                    {report.red_flags.map((flag: string, index: number) => (
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

              {/* Investment Assessment */}
              <section>
                <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Investment Assessment
                </h2>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-muted-foreground leading-relaxed">
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
                  role={message.role as "user" | "assistant"}
                  content={message.content}
                  sources={message.sources}
                />
              ))}
              {isSending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  AI is thinking...
                </div>
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
                className="flex-1 bg-secondary border-border"
                disabled={isSending}
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                className="bg-primary text-white hover:bg-primary/90"
                disabled={isSending}
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
                    disabled={isSending}
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
