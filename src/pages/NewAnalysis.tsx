import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { AnalysisIllustration } from "@/components/brand/Illustrations";
import { api } from "@/lib/api";

const NewAnalysis = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTicker = searchParams.get("ticker");
  const initialName = searchParams.get("name");
  
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialTicker) {
      handleAnalyze(initialTicker, initialName || "");
    }
  }, [initialTicker]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [processingSteps, setProcessingSteps] = useState([
    { name: "Uploading file", status: "pending" as const, progress: 0 },
    { name: "Extracting text from document", status: "pending" as const, progress: 0 },
    { name: "Generating embeddings", status: "pending" as const, progress: 0 },
    { name: "Analyzing financial data", status: "pending" as const, progress: 0 },
    { name: "Generating report", status: "pending" as const, progress: 0 },
  ]);

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

  const handleAnalyze = async (tickerParam?: string, nameParam?: string) => {
    setIsProcessing(true);
    setProgress(0);
    
    const steps = [
      { name: selectedFile && !tickerParam ? "Uploading file" : "Initializing request", status: "processing" as const, progress: 10 },
      { name: "Fetching financial data", status: "pending" as const, progress: 0 },
      { name: "Analyzing fundamentals", status: "pending" as const, progress: 0 },
      { name: "Synthesizing investment case", status: "pending" as const, progress: 0 },
      { name: "Generating report", status: "pending" as const, progress: 0 },
    ];
    setProcessingSteps(steps);

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      let fileId = null;
      let finalTicker = tickerParam || "";
      let finalCompany = nameParam || "";

      // 1. If we have a file selected and no ticker parameter passed
      if (selectedFile && !tickerParam) {
        const uploadRes = await api.analysis.uploadFile(selectedFile);
        fileId = uploadRes.file_id || uploadRes.id;
        finalCompany = selectedFile.name;
        
        setProcessingSteps(prev => {
          const newSteps = [...prev];
          newSteps[0] = { ...newSteps[0], status: "completed", progress: 100 };
          newSteps[1] = { ...newSteps[1], status: "processing", progress: 20 };
          return newSteps;
        });
        setProgress(20);
      } else {
        setProcessingSteps(prev => {
          const newSteps = [...prev];
          newSteps[0] = { ...newSteps[0], status: "completed", progress: 100 };
          newSteps[1] = { ...newSteps[1], status: "processing", progress: 20 };
          return newSteps;
        });
        setProgress(20);
      }

      // Set up a progress timer to simulate active stages
      let simStep = 1;
      progressInterval = setInterval(() => {
        setProcessingSteps(prev => {
          const newSteps = [...prev];
          if (newSteps[simStep]) {
            newSteps[simStep].progress = Math.min(newSteps[simStep].progress + 15, 90);
            if (newSteps[simStep].progress >= 90 && simStep < newSteps.length - 1) {
              newSteps[simStep].status = "completed";
              newSteps[simStep].progress = 100;
              simStep++;
              newSteps[simStep].status = "processing";
              newSteps[simStep].progress = 10;
            }
          }
          return newSteps;
        });
        setProgress(p => Math.min(p + 3, 92));
      }, 700);

      // 2. Call backend analyze endpoint (blocks until completion)
      const analysisRes = await api.analysis.analyzeFile(fileId, finalCompany, finalTicker);
      
      if (progressInterval) clearInterval(progressInterval);

      // Complete all steps
      setProcessingSteps(prev => {
        return prev.map(s => ({ ...s, status: "completed" as const, progress: 100 }));
      });
      setProgress(100);

      setTimeout(() => {
        navigate(`/dashboard/report/${analysisRes.reportId}`);
      }, 500);

    } catch (err: any) {
      if (progressInterval) clearInterval(progressInterval);
      console.error("Analysis execution failed:", err);
      setIsProcessing(false);
      setProcessingSteps(prev => {
        return prev.map(s => s.status === "processing" ? { ...s, status: "failed" as const, progress: 0 } : s);
      });
      alert(err.message || "Financial analysis failed. Please try again.");
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
            Upload financial statements or search for a company to analyze
          </p>
        </motion.div>

        {/* Search Company */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl bg-white border border-border p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Search Public Company
          </h2>
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
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Popular:</span>
              {["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA"].map((ticker) => (
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
                onAnalyze={(company) => {
                  handleAnalyze(company.ticker, company.name);
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
                    onClick={handleAnalyze}
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
