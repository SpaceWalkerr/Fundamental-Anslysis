import { motion } from "framer-motion";
import { CheckCircle, Loader2, Clock } from "lucide-react";

interface ProcessingStep {
  name: string;
  status: "pending" | "processing" | "completed";
  progress?: number;
}

interface FileProcessingStatusProps {
  fileName: string;
  fileSize: number;
  isProcessing: boolean;
  overallProgress: number;
  steps: ProcessingStep[];
}

const FileProcessingStatus = ({
  fileName,
  fileSize,
  isProcessing,
  overallProgress,
  steps,
}: FileProcessingStatusProps) => {
  const getMBSize = () => (fileSize / 1024 / 1024).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/30 border border-primary/20"
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <CheckCircle className="w-4 h-4 text-success" />
          )}
          Processing: {fileName}
        </h3>
        <p className="text-xs text-muted-foreground">
          {getMBSize()} MB • {isProcessing ? "In progress" : "Completed"}
        </p>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Overall Progress
          </span>
          <span className="text-xs font-semibold text-foreground">
            {Math.round(overallProgress)}%
          </span>
        </div>
        <div className="w-full h-2 bg-background rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary to-accent"
          />
        </div>
      </div>

      {/* Processing Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3"
          >
            {/* Status Icon */}
            <div className="flex-shrink-0 mt-1">
              {step.status === "completed" ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : step.status === "processing" ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <Clock className="w-4 h-4 text-muted-foreground/50" />
              )}
            </div>

            {/* Step Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p
                  className={`text-sm font-medium ${
                    step.status === "completed"
                      ? "text-success"
                      : step.status === "processing"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.name}
                </p>
                {step.progress !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(step.progress)}%
                  </span>
                )}
              </div>

              {/* Step Progress Bar */}
              {step.status !== "pending" && step.progress !== undefined && (
                <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${step.progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={`h-full ${
                      step.status === "completed"
                        ? "bg-success"
                        : "bg-primary"
                    }`}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Status Message */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          {overallProgress >= 100
            ? "✓ Analysis complete! Generating final report..."
            : overallProgress >= 75
            ? "Almost there! Generating report..."
            : overallProgress >= 50
            ? "Analyzing financial data..."
            : "Extracting and processing document..."}
        </p>
      </div>
    </motion.div>
  );
};

export default FileProcessingStatus;
