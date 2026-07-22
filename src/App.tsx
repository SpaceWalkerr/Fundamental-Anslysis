import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from './pages/ResetPassword';
import Dashboard from "./pages/Dashboard";
import NewAnalysis from "./pages/NewAnalysis";
import AnalysisReport from "./pages/AnalysisReport";
import StockScanner from "./pages/StockScanner";
import Portfolio from "./pages/Portfolio";
import Watchlist from "./pages/Watchlist";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import UpgradeModal from "@/components/UpgradeModal";
import ProCelebration from "@/components/ProCelebration";
import BuyTokensModal from "@/components/BuyTokensModal";
import RegionToast from "@/components/RegionToast";
import { detectRegion, getRates } from "@/lib/region";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent = () => {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
    // Resolve region (IP → heuristic → US) and warm FX rates once, app-wide,
    // so pricing/examples adapt and the first-visit toast can fire anywhere.
    detectRegion();
    getRates();
  }, [initializeAuth]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <ProtectedRoute requireAuth={false}>
            <Login />
          </ProtectedRoute>
        }
      />
      <Route
        path="/register"
        element={
          <ProtectedRoute requireAuth={false}>
            <Register />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/analyze"
        element={
          <ProtectedRoute>
            <NewAnalysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/report/:id"
        element={
          <ProtectedRoute>
            <AnalysisReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/scanner"
        element={
          <ProtectedRoute>
            <StockScanner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/portfolio"
        element={
          <ProtectedRoute>
            <Portfolio />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/watchlist"
        element={
          <ProtectedRoute>
            <Watchlist />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/history"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pricing"
        element={
          <ProtectedRoute>
            <Pricing />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
          <UpgradeModal />
          <BuyTokensModal />
          <ProCelebration />
          <RegionToast />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
