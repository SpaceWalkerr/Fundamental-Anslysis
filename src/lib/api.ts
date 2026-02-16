// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

// Helper function to make authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
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
      body: JSON.stringify({ name, email, password }),
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

    const token = getAuthToken();
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

  analyzeFile: async (fileId: string, company: string, ticker: string) => {
    const data = await fetchWithAuth('/api/analysis/analyze', {
      method: 'POST',
      body: JSON.stringify({ 
        file_id: fileId, 
        company, 
        ticker 
      }),
    });
    
    return {
      reportId: data.analysis_id,
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

// Export all APIs
export const api = {
  auth: authApi,
  analysis: analysisApi,
  stocks: stockApi,
  chat: chatApi,
};
