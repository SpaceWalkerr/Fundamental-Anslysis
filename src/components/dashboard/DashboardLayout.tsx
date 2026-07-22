import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  FileText,
  Filter,
  Briefcase,
  Eye,
  Clock,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Logo, { LogoMark } from "@/components/brand/Logo";
import { useAuthStore } from "@/store/useAuthStore";
import { usePlanStore, formatTokens } from "@/store/usePlanStore";
import OnboardingTour, { startTour } from "@/components/OnboardingTour";
import RegionSwitcher from "@/components/RegionSwitcher";

interface SidebarProps {
  children: React.ReactNode;
}

const navItems = [
  { name: "Home", icon: Home, href: "/dashboard", premium: false },
  { name: "New Analysis", icon: FileText, href: "/dashboard/analyze", premium: false },
  { name: "Stock Scanner", icon: Filter, href: "/dashboard/scanner", premium: true },
  { name: "Portfolio", icon: Briefcase, href: "/dashboard/portfolio", premium: false },
  { name: "Watchlist", icon: Eye, href: "/dashboard/watchlist", premium: false },
  { name: "History", icon: Clock, href: "/dashboard/history", premium: false },
  { name: "Settings", icon: Settings, href: "/dashboard/settings", premium: false },
];

const DashboardLayout = ({ children }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, initializeAuth } = useAuthStore();
  const isPro = usePlanStore((s) => s.isPro)();
  const wallet = usePlanStore((s) => s.wallet);
  const fetchWallet = usePlanStore((s) => s.fetchWallet);
  const openBuyTokens = usePlanStore((s) => s.openBuyTokens);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Refresh profile metrics and the AI token balance when the dashboard mounts
  useEffect(() => {
    initializeAuth();
    fetchWallet();
  }, [initializeAuth, fetchWallet]);

  return (
    <div className="min-h-screen bg-secondary/30 flex">
      {/* Sidebar — Clean white, Xtin-aligned */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 260 }}
        transition={{ duration: 0.2 }}
        className="fixed left-0 top-0 h-full bg-white border-r border-border flex flex-col z-40"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            {collapsed ? (
              <LogoMark size={36} />
            ) : (
              <Logo size="md" />
            )}
          </Link>
        </div>

        {/* Region / currency — sets prices, symbols & examples app-wide */}
        <div className={cn("px-3 pt-3", collapsed ? "flex justify-center" : "")} data-tour="region-switcher">
          <RegionSwitcher compact={collapsed} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5" data-tour="sidebar-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                data-tour={item.premium ? "nav-premium" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group",
                  isActive
                    ? "bg-accent text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-primary")} />
                {!collapsed && (
                  <>
                    <span className="text-sm">{item.name}</span>
                    {item.premium && (
                      <span className="ml-auto text-[9px] font-extrabold tracking-wide px-1.5 py-0.5 rounded bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                        PRO
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.premium && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* AI token balance — the metered fuel for reports & Q&A */}
        {!collapsed && wallet && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-white border border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-primary" /> AI tokens
              </span>
              <span className="text-xs font-bold text-foreground">{formatTokens(wallet.balance)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.round((wallet.balance / Math.max(1, wallet.monthly_grant)) * 100))}%` }}
              />
            </div>
            <button
              onClick={() => (isPro ? openBuyTokens() : usePlanStore.getState().openUpgrade("reports"))}
              className="mt-2 text-[11px] font-semibold text-primary hover:underline"
            >
              {isPro ? "Buy more tokens" : "Get more with Pro →"}
            </button>
          </div>
        )}

        {/* Upgrade Card — Dynamic based on plan */}
        {!collapsed && user?.plan !== 'premium' && user?.plan !== 'enterprise' && (
          <div className="mx-3 mb-3 p-4 rounded-2xl bg-accent border border-primary/10" data-tour="upgrade-card">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground capitalize">{user?.plan || "Free"} Plan</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {Math.max(0, (user?.reportsLimit || 5) - (user?.reportsUsed || 0))} reports remaining this month
            </p>
            <Button
              size="sm"
              onClick={() => usePlanStore.getState().openUpgrade("general")}
              className="w-full bg-primary hover:bg-primary/90 text-white text-xs rounded-full font-medium"
            >
              Upgrade to Premium
            </Button>
          </div>
        )}

        {/* Bottom actions */}
        <div className="p-3 border-t border-border space-y-0.5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Log Out</span>}
          </button>
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center hover:bg-accent transition-colors shadow-sm"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      </motion.aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 transition-all duration-200 min-h-screen",
          collapsed ? "ml-[76px]" : "ml-[260px]"
        )}
      >
        {children}
      </main>

      {/* First-run guided tour + re-launch control */}
      <OnboardingTour />
      <button
        onClick={startTour}
        title="Take the tour"
        className="fixed bottom-5 right-5 z-40 w-11 h-11 rounded-full bg-white border border-border shadow-lg flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
        aria-label="Take the product tour"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    </div>
  );
};

export default DashboardLayout;
