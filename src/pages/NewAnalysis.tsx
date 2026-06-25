import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
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
  FileSpreadsheet,
  FileBarChart,
  Presentation,
} from "lucide-react";
import { AnalysisIllustration } from "@/components/brand/Illustrations";

const NewAnalysis = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [processingSteps, setProcessingSteps] = useState([
    { name: "Uploading file", status: "pending" as const, progress: 0 },
    { name: "Extracting text from document", status: "pending" as const, progress: 0 },
    { name: "Generating embeddings", status: "pending" as const, progress: 0 },
    { name: "Analyzing financial data", status: "pending" as const, progress: 0 },
    { name: "Generating report", status: "pending" as const, progress: 0 },
  ]);

  const validateAndSetFile = (file: File) => {
    const validExtensions = [".pdf", ".xlsx", ".xls", ".csv"];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setShakeActive(true);
      setTimeout(() => setShakeActive(false), 500);
      toast.error("Unsupported file format", {
        description: `Please upload a PDF, Excel, or CSV file.`,
      });
      return;
    }

    // Start Scanning state
    setIsScanning(true);
    setScanProgress(0);
    const scanInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(scanInterval);
          setTimeout(() => {
            setIsScanning(false);
            setSelectedFile(file);
          }, 300);
          return 100;
        }
        return prev + 10;
      });
    }, 70);
  };

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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleAnalyze = () => {
    setIsProcessing(true);
    setProgress(0);
    
    const stepDurations = [1500, 1800, 2000, 1500, 1200]; // ms for each step
    let currentStep = 0;
    let currentProgress = 0;

    const animateStep = () => {
      if (currentStep >= processingSteps.length) {
        setTimeout(() => {
          navigate("/dashboard/report/1");
        }, 500);
        return;
      }

      const stepDuration = stepDurations[currentStep];
      const startProgress = currentProgress;
      const startTime = Date.now();

      setProcessingSteps((prev) => {
        const newSteps = [...prev];
        newSteps[currentStep].status = "processing";
        return newSteps;
      });

      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const stepProgress = Math.min((elapsed / stepDuration) * 100, 100);
        const totalProgress = (currentStep * 20) + (stepProgress / 5);

        setProgress(totalProgress);
        setProcessingSteps((prev) => {
          const newSteps = [...prev];
          newSteps[currentStep].progress = stepProgress;
          return newSteps;
        });

        if (elapsed >= stepDuration) {
          clearInterval(progressInterval);
          setProcessingSteps((prev) => {
            const newSteps = [...prev];
            newSteps[currentStep].status = "completed";
            newSteps[currentStep].progress = 100;
            return newSteps;
          });
          currentProgress = (currentStep + 1) * 20;
          currentStep++;
          setTimeout(animateStep, 300);
        }
      }, 50);
    };

    animateStep();
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full min-w-0">
        {/* Header — enhanced with gradient text and badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
            New Analysis
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span>Upload financial statements or search for a company to analyze</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-xs font-medium text-primary w-fit">
              2 ways to start
            </span>
          </p>
        </motion.div>

        {/* Search Company — xtin-card with gradient border */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="xtin-card gradient-border mb-6"
        >
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Search className="w-4 h-4 text-primary" />
            </div>
            Search Public Company
          </h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter company name or ticker symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-secondary border-border rounded-xl"
            />
          </div>
          
          {/* Popular Tickers — enhanced with micro-animations */}
          {!searchQuery && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-1">Popular:</span>
              {["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA"].map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => setSearchQuery(ticker)}
                  className="ticker-chip bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  {ticker}
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {searchQuery && (
            <div className="mt-6 pt-4 border-t border-border/50">
              <CompanySearchResults
                query={searchQuery}
                onAnalyze={(company) => {
                  handleAnalyze();
                }}
              />
            </div>
          )}
        </motion.div>

        {/* Styled section divider */}
        <div className="section-divider">
          <span>
            <Upload className="w-3.5 h-3.5" />
            Or upload documents
            <Search className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* File Upload — enhanced card with drag feedback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="xtin-card"
        >
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Upload className="w-4 h-4 text-primary" />
            </div>
            Upload Financial Statements
          </h2>

          {isScanning ? (
            <div className="border border-border rounded-xl p-6 sm:p-10 md:p-12 text-center bg-accent/10 relative overflow-hidden">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
              <p className="text-foreground font-semibold mb-1">Scanning document layout...</p>
              <p className="text-xs text-muted-foreground mb-4">Verifying financial data structure</p>
              <div className="max-w-xs mx-auto">
                <Progress value={scanProgress} className="h-1.5 bg-secondary" />
              </div>
            </div>
          ) : !selectedFile ? (
            <label
              htmlFor="file-upload"
              className={`block border-2 border-dashed rounded-xl p-6 sm:p-8 md:p-12 text-center cursor-pointer transition-all duration-300 ${
                shakeActive ? "animate-shake border-destructive bg-destructive/5" : ""
              } ${
                dragActive
                  ? "drop-zone-active border-primary shadow-lg scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:bg-accent/20"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <AnalysisIllustration size={120} className="mx-auto mb-4 sm:hidden" />
              <AnalysisIllustration size={160} className="mx-auto mb-4 hidden sm:block" />
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
            <div className="p-4 sm:p-6 rounded-xl bg-secondary/50 border border-border gradient-border">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-foreground break-all">
                      {selectedFile.name}
                    </p>
                    {!isProcessing && (
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>

                  <Button
                    onClick={handleAnalyze}
                    className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90 gap-2 glow"
                  >
                    Start Analysis
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Supported Documents — enhanced with icons and styling */}
          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-accent/50 border-t-2 border-primary/10">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Supported Documents
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2.5">
              <li className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-primary/60 flex-shrink-0" />
                Annual Reports (10-K, 20-F)
              </li>
              <li className="flex items-center gap-2.5">
                <FileBarChart className="w-4 h-4 text-primary/60 flex-shrink-0" />
                Quarterly Reports (10-Q)
              </li>
              <li className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-primary/60 flex-shrink-0" />
                Income Statements, Balance Sheets, Cash Flow Statements
              </li>
              <li className="flex items-center gap-2.5">
                <Presentation className="w-4 h-4 text-primary/60 flex-shrink-0" />
                Investor Presentations with Financial Data
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default NewAnalysis;
