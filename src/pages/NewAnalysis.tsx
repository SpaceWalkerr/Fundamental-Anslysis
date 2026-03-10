import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

const NewAnalysis = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
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
                  handleAnalyze();
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
