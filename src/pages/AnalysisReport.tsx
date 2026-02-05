import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      "I've analyzed Apple's financial statements. Feel free to ask me any questions about the analysis!",
  },
];

const AnalysisReport = () => {
  const { id } = useParams();
  const [messages, setMessages] = useState(chatMessages);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newUserMessage = { role: "user", content: inputValue };
    const mockResponse = {
      role: "assistant",
      content: `Based on the financial statements, ${inputValue.toLowerCase().includes("revenue") ? "Apple's revenue has shown consistent growth driven by Services and iPhone segments. The company reported $394.3B in FY2024, representing a 2.8% YoY increase." : inputValue.toLowerCase().includes("debt") ? "Apple's total debt stands at $123B, with a debt-to-equity ratio of 1.98. While higher than historical norms, the company's robust cash flow easily covers interest expenses with an interest coverage ratio of 42x." : "I'd be happy to explain that. Looking at the financial data, Apple maintains strong fundamentals across most metrics. Is there a specific aspect you'd like me to elaborate on?"}`,
    };

    setMessages([...messages, newUserMessage, mockResponse]);
    setInputValue("");
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-2rem)] m-4 gap-4">
        {/* Report Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 rounded-xl bg-card border border-border overflow-hidden flex flex-col"
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
                <Button size="sm" className="gap-2 bg-gradient-primary">
                  <Download className="w-4 h-4" />
                  Export PDF
                </Button>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-serif font-semibold text-foreground">
                    {reportData.company}
                  </h1>
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary text-sm font-medium">
                    {reportData.ticker}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {reportData.exchange}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Analysis generated on {reportData.date}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">
                  Overall Score
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  <span className="text-3xl font-serif font-semibold text-success">
                    {reportData.overallScore}/10
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
                <h2 className="text-lg font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Executive Summary
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {reportData.summary}
                </p>
              </section>

              {/* Score Cards */}
              <section>
                <h2 className="text-lg font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Financial Health Scores
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(reportData.metrics).map(([key, value]) => (
                    <div
                      key={key}
                      className="p-4 rounded-lg bg-secondary/50 border border-border"
                    >
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {key}
                      </p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-serif font-semibold text-foreground">
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
                <h2 className="text-lg font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  Key Financial Ratios
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {reportData.keyRatios.map((ratio, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-secondary/50 border border-border"
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {ratio.name}
                      </p>
                      <p className="text-xl font-serif font-semibold text-foreground mb-1">
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
                  <h2 className="text-lg font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    Strengths
                  </h2>
                  <ul className="space-y-3">
                    {reportData.strengths.map((strength, index) => (
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
                  <h2 className="text-lg font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Red Flags & Concerns
                  </h2>
                  <ul className="space-y-3">
                    {reportData.redFlags.map((flag, index) => (
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
                <h2 className="text-lg font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Investment Assessment
                </h2>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-muted-foreground leading-relaxed">
                    {reportData.investmentAssessment}
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
          className="w-full lg:w-96 rounded-xl bg-card border border-border overflow-hidden flex flex-col"
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
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 ${
                      message.role === "user"
                        ? "chat-bubble-user"
                        : "chat-bubble-assistant"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
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
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                className="bg-gradient-primary"
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
