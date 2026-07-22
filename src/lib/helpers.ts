/**
 * Utility function to format currency values
 */
export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Utility function to format large numbers (e.g., market cap)
 */
export const formatLargeNumber = (value: number): string => {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(1)}T`;
  }
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `$${value.toLocaleString()}`;
};

/**
 * Utility function to format percentages
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Utility function to format dates
 */
export const formatDate = (date: Date | string, format: 'short' | 'long' = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'long') {
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Utility function to get relative time (e.g., "2 days ago")
 */
export const getRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  return formatDate(dateObj);
};

/**
 * Utility function to truncate text
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Utility function to generate a random ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Utility function to debounce a function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Utility function to calculate score color
 */
export const getScoreColor = (score: number): string => {
  if (score >= 8) return 'text-success';
  if (score >= 6) return 'text-warning';
  return 'text-destructive';
};

/**
 * Utility function to calculate score label
 */
export const getScoreLabel = (score: number): string => {
  if (score >= 9) return 'Excellent';
  if (score >= 8) return 'Strong';
  if (score >= 7) return 'Good';
  if (score >= 6) return 'Fair';
  if (score >= 5) return 'Weak';
  return 'Poor';
};

/**
 * Utility function to validate file type
 */
export const isValidFileType = (file: File): boolean => {
  const validTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ];
  return validTypes.includes(file.type);
};

/**
 * Utility function to get file extension
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

/**
 * Utility function to format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Utility function to copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

/**
 * A report with the fields needed to render a PDF (superset of the list item;
 * the full report from `getReport` supplies the analysis text).
 */
export interface ExportableReport {
  ticker: string;
  company: string;
  overall_score: number;
  summary?: string;
  strengths?: string[];
  red_flags?: string[];
  investment_assessment?: string;
}

/**
 * Shared PDF export flow used by both the report page and History.
 * Pro-gated (free users get the upgrade modal). Returns 'gated' if the
 * upgrade modal was shown, 'ok' if a PDF was downloaded. Throws on API error
 * so callers can surface a toast.
 */
export const exportReportPdf = async (
  report: ExportableReport
): Promise<'gated' | 'ok'> => {
  // Imported lazily to avoid a circular import (store/api ↔ helpers).
  const { usePlanStore } = await import('@/store/usePlanStore');
  const { api, downloadBlob } = await import('@/lib/api');

  if (!usePlanStore.getState().isPro()) {
    usePlanStore.getState().openUpgrade('export');
    return 'gated';
  }

  const analysisData = {
    ticker: report.ticker,
    company_name: report.company,
    recommendation:
      report.overall_score >= 8 ? 'BUY' : report.overall_score >= 6 ? 'HOLD' : 'SELL',
    score: report.overall_score * 10,
    strengths: report.strengths,
    weaknesses: report.red_flags,
    ai_summary: report.summary,
    ai_recommendation: report.investment_assessment,
  };

  const blob = await api.pdf.exportAnalysis(report.ticker, analysisData);
  downloadBlob(blob, `analysis_${report.ticker}.pdf`);
  return 'ok';
};

/**
 * Utility function to download data as file
 */
export const downloadFile = (data: string, filename: string, mimeType: string): void => {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
