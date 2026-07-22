import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePlanStore } from "@/store/usePlanStore";
import { useRegion } from "@/hooks/use-region";
import { popularTickers } from "@/lib/region";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CompanySearchResults from "@/components/CompanySearchResults";
import FileProcessingStatus from "@/components/FileProcessingStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Upload,
  FileText,
  X,
  CheckCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { AnalysisIllustration } from "@/components/brand/Illustrations";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type StepStatus = "pending" | "processing" | "completed";
interface ProcessingStep {
  name: string;
  status: StepStatus;
  progress: number;
}

const INITIAL_STEPS: ProcessingStep[] = [
  { name: "Uploading file", status: "pending", progress: 0 },
  { name: "Extracting text from document", status: "pending", progress: 0 },
  { name: "Generating embeddings", status: "pending", progress: 0 },
  { name: "Analyzing financial data", status: "pending", progress: 0 },
  { name: "Generating report", status: "pending", progress: 0 },
];

const NewAnalysis = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { region } = useRegion();
  const [searchQuery, setSearchQuery] = useState("");
  // Seed from the user's saved defaults (Settings → Preferences), else fall back.
  const [investorStyle, setInvestorStyle] = useState(
    () => localStorage.getItem("fk_pref_style") || "balanced"
  );
  const [horizon, setHorizon] = useState(
    () => localStorage.getItem("fk_pref_horizon") || "long_term"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>(INITIAL_STEPS);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const markStep = (index: number, status: StepStatus) => {
    setProcessingSteps((prev) =>
      prev.map((step, i) =>
        i === index
          ? {
              ...step,
              status,
              progress: status === "completed" ? 100 : status === "processing" ? 50 : step.progress,
            }
          : step
      )
    );
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please choose a financial document to analyze.",
        variant: "destructive",
      });
      return;
    }

    // Token gate: no balance → upgrade (free) or top up (pro) before spending effort.
    const plan = usePlanStore.getState();
    const w = plan.wallet;
    if (w && w.balance < 20000) {
      plan.isPro() ? plan.openBuyTokens() : plan.openUpgrade("reports");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingSteps(INITIAL_STEPS);

    // Derive a readable company name from the file name (backend also reads document metadata)
    const companyName = selectedFile.name.replace(/\.[^/.]+$/, "");

    try {
      // 1. Upload — the backend extracts text and builds embeddings during this request
      markStep(0, "processing");
      const upload = await api.analysis.uploadFile(selectedFile);
      markStep(0, "completed");
      markStep(1, "completed");
      markStep(2, "completed");
      setProgress(60);

      // 2. Run the AI analysis (this generates the report)
      markStep(3, "processing");
      markStep(4, "processing");
      const result = await api.analysis.analyzeFile(upload.file_id, companyName, "", {
        investorStyle,
        horizon,
        region,
      });
      markStep(3, "completed");
      markStep(4, "completed");
      setProgress(100);

      if (!result.reportId) {
        throw new Error("Analysis did not return a report id.");
      }

      // Balance changed — refresh the wallet, then open the finished report
      usePlanStore.getState().fetchWallet();
      setTimeout(() => navigate(`/dashboard/report/${result.reportId}`), 400);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Analysis failed. Please try again.";
      // Out of tokens → route to the right purchase surface instead of a dead error.
      if (/token/i.test(message)) {
        const plan = usePlanStore.getState();
        plan.isPro() ? plan.openBuyTokens() : plan.openUpgrade("reports");
      } else {
        toast({ title: "Analysis failed", description: message, variant: "destructive" });
      }
      setIsProcessing(false);
      setProgress(0);
      setProcessingSteps(INITIAL_STEPS);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            New Analysis
          </h1>
          <p className="text-muted-foreground">
            Upload financial statements and we'll write the report the way you invest
          </p>
        </motion.div>

        {/* Personalization — tailor the analysis to the investor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="rounded-2xl bg-white border border-border p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Tailor this analysis to you
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Gini writes every report through your lens — the same filing, read the way <em>you</em> invest.
          </p>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How do you invest?</Label>
          <div className="flex flex-wrap gap-2 mt-2 mb-4">
            {[
              { id: "beginner", label: "New to investing" },
              { id: "value", label: "Value" },
              { id: "growth", label: "Growth" },
              { id: "income", label: "Dividends / Income" },
              { id: "trader", label: "Shorter-term" },
              { id: "balanced", label: "Balanced" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setInvestorStyle(s.id)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  investorStyle === s.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your horizon</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              { id: "long_term", label: "Long term (years)" },
              { id: "medium", label: "Medium (6–18 mo)" },
              { id: "short", label: "Short term" },
            ].map((h) => (
              <button
                key={h.id}
                onClick={() => setHorizon(h.id)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  horizon === h.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Search Company */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl bg-white border border-border p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Search Public Company
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Find a company, then upload its latest annual or quarterly report below to generate the analysis.
          </p>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter company name or ticker symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-secondary border-border"
            />
          </div>
          
          {/* Popular Tickers */}
          {!searchQuery && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Popular:</span>
              {popularTickers(region).map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => setSearchQuery(ticker)}
                  className="px-3 py-1.5 rounded-full bg-secondary text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  {ticker}
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {searchQuery && (
            <div className="mt-6">
              <CompanySearchResults
                query={searchQuery}
                onAnalyze={(company: any) => {
                  toast({
                    title: `Ready to analyse ${company?.name || company?.ticker || "this company"}`,
                    description:
                      "Upload its latest annual/quarterly report in the box below and Gini will do the rest.",
                  });
                  document
                    .querySelector('[data-tour="upload-report"], #file-upload')
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              />
            </div>
          )}
        </motion.div>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-4 text-muted-foreground">
              Or upload documents
            </span>
          </div>
        </div>

        {/* File Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl bg-white border border-border p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload Financial Statements
          </h2>

          {!selectedFile ? (
            <label
              htmlFor="file-upload"
              className={`block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-primary bg-accent/30"
                  : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <AnalysisIllustration size={160} className="mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">
                Drag & drop files here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF, Excel (.xlsx, .xls), CSV • Max 25MB
              </p>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : isProcessing ? (
            <FileProcessingStatus
              fileName={selectedFile.name}
              fileSize={selectedFile.size}
              isProcessing={isProcessing}
              overallProgress={progress}
              steps={processingSteps}
            />
          ) : (
            <div className="p-6 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">
                      {selectedFile.name}
                    </p>
                    {!isProcessing && (
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>

                  <Button
                    onClick={() => handleAnalyze()}
                    className="bg-primary text-white hover:bg-primary/90 gap-2"
                  >
                    Start Analysis
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 rounded-lg bg-secondary/30 border border-border">
            <h3 className="text-sm font-medium text-foreground mb-2">
              Supported Documents
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Annual Reports (10-K, 20-F)</li>
              <li>• Quarterly Reports (10-Q)</li>
              <li>• Income Statements, Balance Sheets, Cash Flow Statements</li>
              <li>• Investor Presentations with Financial Data</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default NewAnalysis;
