import { supabase } from './supabase';

// API Base URL
const DEFAULT_API_URL = import.meta.env.PROD
  ? 'https://fundamental-anslysis-4rwu.onrender.com'
  : 'http://localhost:8080';

const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

// Helper function to get auth token.
// Prefer the live Supabase session token (auto-refreshed, used by Google OAuth
// logins); fall back to the token stored by the backend email/password login
// and the dev test-login token.
const getAuthToken = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return data.session.access_token;
    }
  } catch {
    // ignore and fall back to the stored token
  }
  return localStorage.getItem('auth_token');
};

// Helper function to make authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || error.message || 'Request failed');
  }

  return response.json();
};

// Real API service for authentication
export const authApi = {
  login: async (email: string, password: string) => {
    const data = await fetchWithAuth('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store token
    localStorage.setItem('auth_token', data.access_token);

    return {
      user: data.user,
      token: data.access_token,
    };
  },

  register: async (name: string, email: string, password: string) => {
    const data = await fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, confirm_password: password }),
    });

    // Store token
    localStorage.setItem('auth_token', data.access_token);

    return {
      user: data.user,
      token: data.access_token,
    };
  },

  logout: async () => {
    try {
      await fetchWithAuth('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      localStorage.removeItem('auth_token');
    }
    return { success: true };
  },

  getProfile: async () => {
    const data = await fetchWithAuth('/api/auth/me');
    return data;
  },

  updateProfile: async (updates: any) => {
    const data = await fetchWithAuth('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return {
      success: true,
      user: data,
    };
  },
};

// Real API service for financial analysis
export const analysisApi = {
  uploadFile: async (file: File, company?: string, ticker?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (company) formData.append('company', company);
    if (ticker) formData.append('ticker', ticker);

    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/analysis/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  },

  analyzeFile: async (fileId: string | null, company: string, ticker: string) => {
    const data = await fetchWithAuth('/api/analysis/analyze', {
      method: 'POST',
      body: JSON.stringify({
        file_id: fileId,
        company_name: company,
        company_ticker: ticker,
      }),
    });

    return {
      reportId: data.report_id,
      status: data.status,
      company,
      ticker,
    };
  },

  getAnalysisStatus: async (analysisId: string) => {
    return await fetchWithAuth(`/api/analysis/status/${analysisId}`);
  },

  getReport: async (reportId: string) => {
    return await fetchWithAuth(`/api/reports/${reportId}`);
  },

  getReportsList: async (limit: number = 20, offset: number = 0) => {
    return await fetchWithAuth(`/api/reports/list?limit=${limit}&offset=${offset}`);
  },

  searchCompany: async (query: string) => {
    const data = await fetchWithAuth(`/api/stocks/search?query=${encodeURIComponent(query)}`);
    return data.results || [];
  },
};

// Real API service for stock screening
export const stockApi = {
  getStockData: async (ticker: string) => {
    return await fetchWithAuth(`/api/stocks/details/${ticker}`);
  },

  screenStocks: async (filters: any) => {
    const data = await fetchWithAuth('/api/stocks/screener', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
    return data.results || [];
  },

  getWatchlist: async () => {
    // TODO: Implement watchlist endpoint in backend
    // For now return empty array
    return [];
  },

  getTechnicalIndicators: async (ticker: string, period: string = '1y', includeSignals: boolean = false) => {
    return await fetchWithAuth(`/api/stocks/${ticker}/technicals?period=${period}&include_signals=${includeSignals}`);
  },

  getTradingSignals: async (ticker: string) => {
    return await fetchWithAuth(`/api/stocks/${ticker}/signals`);
  },
};

// Real API service for chat/Q&A
export const chatApi = {
  sendMessage: async (reportId: string, message: string) => {
    const data = await fetchWithAuth('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ 
        report_id: reportId, 
        message 
      }),
    });

    return {
      message: data.response,
      timestamp: data.timestamp || new Date().toISOString(),
      sources: data.sources || [],
    };
  },

  getChatHistory: async (reportId: string) => {
    const data = await fetchWithAuth(`/api/chat/history/${reportId}`);
    return data.messages || [];
  },
};

// Real API service for PDF export
export const pdfApi = {
  exportAnalysis: async (ticker: string, analysisData: any) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/pdf/export/analysis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticker,
        analysis_data: analysisData,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'PDF export failed' }));
      throw new Error(error.detail || 'PDF export failed');
    }

    // Return blob for download
    return await response.blob();
  },

  exportAnalysisByTicker: async (ticker: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/pdf/export/analysis/${ticker}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'PDF export failed' }));
      throw new Error(error.detail || 'PDF export failed');
    }

    return await response.blob();
  },

  exportScreening: async (presetName: string, screeningData: any) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/pdf/export/screening`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preset_name: presetName,
        description: screeningData.description,
        stocks: screeningData.stocks,
        filters: screeningData.filters,
        total_matches: screeningData.total_matches,
        average_score: screeningData.average_score,
        top_sectors: screeningData.top_sectors,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'PDF export failed' }));
      throw new Error(error.detail || 'PDF export failed');
    }

    return await response.blob();
  },

  exportTechnical: async (ticker: string, technicalData: any) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/pdf/export/technical`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticker,
        technical_data: technicalData,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'PDF export failed' }));
      throw new Error(error.detail || 'PDF export failed');
    }

    return await response.blob();
  },

  exportTechnicalByTicker: async (ticker: string, period: string = '1y') => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/pdf/export/technical/${ticker}?period=${period}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'PDF export failed' }));
      throw new Error(error.detail || 'PDF export failed');
    }

    return await response.blob();
  },

  getExportInfo: async () => {
    return await fetchWithAuth('/api/pdf/export/info');
  },
};

// Helper function to download blob as file
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Real API service for portfolios
export const portfolioApi = {
  // Portfolio CRUD
  createPortfolio: async (data: { name: string; description?: string; currency?: string; is_default?: boolean }) => {
    return await fetchWithAuth('/api/portfolios/portfolios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getPortfolios: async () => {
    return await fetchWithAuth('/api/portfolios/portfolios');
  },

  getPortfolio: async (portfolioId: string) => {
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}`);
  },

  updatePortfolio: async (portfolioId: string, data: { name?: string; description?: string; is_default?: boolean }) => {
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deletePortfolio: async (portfolioId: string) => {
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}`, {
      method: 'DELETE',
    });
  },

  // Holdings
  getHoldings: async (portfolioId: string, includePrices: boolean = true) => {
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}/holdings?include_prices=${includePrices}`);
  },

  getHolding: async (portfolioId: string, ticker: string) => {
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}/holdings/${ticker}`);
  },

  updateHoldingNotes: async (portfolioId: string, ticker: string, notes: string) => {
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}/holdings/${ticker}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  },

  // Transactions
  addTransaction: async (portfolioId: string, transaction: {
    ticker: string;
    company_name?: string;
    transaction_type: 'BUY' | 'SELL' | 'DIVIDEND' | 'SPLIT';
    quantity: number;
    price_per_share: number;
    fees?: number;
    transaction_date: string;
    notes?: string;
  }) => {
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  },

  getTransactions: async (portfolioId: string, filters?: { ticker?: string; transaction_type?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.ticker) params.append('ticker', filters.ticker);
    if (filters?.transaction_type) params.append('transaction_type', filters.transaction_type);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const queryString = params.toString();
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}/transactions${queryString ? '?' + queryString : ''}`);
  },

  deleteTransaction: async (portfolioId: string, transactionId: string) => {
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}/transactions/${transactionId}`, {
      method: 'DELETE',
    });
  },

  // Summary & Analytics
  getSummary: async (portfolioId: string) => {
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}/summary`);
  },

  getAnalytics: async (portfolioId: string) => {
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}/analytics`);
  },

  getPerformance: async (portfolioId: string, period: 'all_time' | '1y' | '3m' | '1m' | '1w' = 'all_time') => {
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}/performance?period=${period}`);
  },

  getRealizedGains: async (portfolioId: string) => {
    return await fetchWithAuth(`/api/portfolios/portfolios/${portfolioId}/realized-gains`);
  },
};

// Watchlist API
export const watchlistApi = {
  // Watchlists CRUD
  getWatchlists: async () => {
    return await fetchWithAuth('/api/watchlists/watchlists');
  },

  getWatchlist: async (watchlistId: string) => {
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}`);
  },

  createWatchlist: async (watchlist: {
    name: string;
    description?: string | null;
    color?: string | null;
    is_default?: boolean;
  }) => {
    return await fetchWithAuth('/api/watchlists/watchlists', {
      method: 'POST',
      body: JSON.stringify(watchlist),
    });
  },

  updateWatchlist: async (watchlistId: string, updates: {
    name?: string;
    description?: string | null;
    color?: string | null;
    is_default?: boolean;
    sort_order?: number;
  }) => {
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteWatchlist: async (watchlistId: string) => {
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}`, {
      method: 'DELETE',
    });
  },

  // Watchlist Items
  getWatchlistItems: async (watchlistId: string, includePrices: boolean = true) => {
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}/items?include_prices=${includePrices}`);
  },

  getWatchlistItem: async (watchlistId: string, itemId: string) => {
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}/items/${itemId}`);
  },

  addItemToWatchlist: async (watchlistId: string, item: {
    ticker: string;
    company_name?: string | null;
    target_price?: number | null;
    target_price_type?: 'BUY' | 'SELL' | 'ALERT' | null;
    notes?: string | null;
    tags?: string[];
  }) => {
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  updateWatchlistItem: async (watchlistId: string, itemId: string, updates: {
    target_price?: number | null;
    target_price_type?: 'BUY' | 'SELL' | 'ALERT' | null;
    notes?: string | null;
    tags?: string[];
  }) => {
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  removeItemFromWatchlist: async (watchlistId: string, itemId: string) => {
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  // Bulk Operations
  addItemsBulk: async (watchlistId: string, tickers: string[]) => {
    const params = new URLSearchParams();
    tickers.forEach(ticker => params.append('tickers', ticker));
    
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}/items/bulk?${params.toString()}`, {
      method: 'POST',
    });
  },

  removeItemsBulk: async (watchlistId: string, tickers: string[]) => {
    const params = new URLSearchParams();
    tickers.forEach(ticker => params.append('tickers', ticker));
    
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}/items?${params.toString()}`, {
      method: 'DELETE',
    });
  },

  // Analytics
  getWatchlistSummary: async (watchlistId: string) => {
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}/summary`);
  },

  createSnapshot: async (watchlistId: string) => {
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}/snapshot`, {
      method: 'POST',
    });
  },

  getSnapshots: async (watchlistId: string, days: number = 30) => {
    return await fetchWithAuth(`/api/watchlists/watchlists/${watchlistId}/snapshots?days=${days}`);
  },
};

// Subscription/Payment API
export const subscriptionApi = {
  // Get available subscription plans
  getPlans: async () => {
    return await fetchWithAuth('/api/subscription-plans');
  },

  // Get current subscription status
  getStatus: async () => {
    return await fetchWithAuth('/api/subscription/status');
  },

  // Get usage for specific feature
  getUsage: async (type: string) => {
    return await fetchWithAuth(`/api/subscription/usage/${type}`);
  },

  // Create checkout session
  createCheckout: async (priceId: string, billingCycle: string) => {
    return await fetchWithAuth('/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ price_id: priceId, billing_cycle: billingCycle }),
    });
  },

  // Create portal session
  createPortal: async (returnUrl: string) => {
    return await fetchWithAuth('/api/subscription/portal', {
      method: 'POST',
      body: JSON.stringify({ return_url: returnUrl }),
    });
  },

  // Cancel subscription
  cancelSubscription: async (subscriptionId: string) => {
    return await fetchWithAuth('/api/subscription/cancel', {
      method: 'POST',
      body: JSON.stringify({ subscription_id: subscriptionId }),
    });
  },

  // Check feature access
  checkFeature: async (featureName: string) => {
    return await fetchWithAuth('/api/subscription/check-feature', {
      method: 'POST',
      body: JSON.stringify({ feature_name: featureName }),
    });
  },
};

// Export all APIs
export const api = {
  auth: authApi,
  analysis: analysisApi,
  stocks: stockApi,
  chat: chatApi,
  pdf: pdfApi,
  portfolio: portfolioApi,
  watchlists: watchlistApi,
  subscription: subscriptionApi,
};
