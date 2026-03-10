import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-6">
              We're sorry, but something unexpected happened. Please try refreshing
              the page.
            </p>
            {this.state.error && (
              <details className="text-left mb-6 p-4 rounded-lg bg-secondary text-sm">
                <summary className="cursor-pointer font-medium text-foreground mb-2">
                  Error Details
                </summary>
                <code className="text-xs text-muted-foreground break-all">
                  {this.state.error.message}
                </code>
              </details>
            )}
            <Button onClick={this.handleReset}>Try Again</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
