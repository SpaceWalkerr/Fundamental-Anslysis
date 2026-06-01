import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Logo, { LogoMark } from "@/components/brand/Logo";
import { useAuthStore } from "@/store/useAuthStore";
import LiveTickerBar from "@/components/LiveTickerBar";
import ThemeToggle from "@/components/ThemeToggle";

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
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="app-shell min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary-token)]">
      <LiveTickerBar className="fixed left-0 right-0 top-0 z-50" />
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 260 }}
        transition={{ duration: 0.2 }}
        className="fixed left-0 top-12 z-40 flex h-[calc(100%-3rem)] flex-col border-r border-[var(--border-token)] bg-[var(--bg-primary)]"
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-[var(--border-token)] px-4">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            {collapsed ? (
              <LogoMark size={36} variant="white" />
            ) : (
              <Logo size="md" variant="white" />
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "relative group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                  isActive
                    ? "border-l-[3px] border-[var(--accent-token)] bg-[var(--bg-card)] text-[var(--text-primary-token)] font-semibold"
                    : "text-[var(--text-muted-token)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary-token)]"
                )}
              >
                <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-[var(--accent-token)]")} />
                {!collapsed && (
                  <>
                    <span className="text-sm">{item.name}</span>
                    {item.premium && (
                      <Sparkles className="ml-auto h-3.5 w-3.5 text-[var(--warning-token)]" />
                    )}
                  </>
                )}
                {collapsed && item.premium && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--warning-token)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Card */}
        {!collapsed && (
          <div className="mx-3 mb-3 rounded-lg border border-[var(--border-token)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-4 w-4 text-[var(--accent-token)]" />
              <span className="text-sm font-semibold text-[var(--text-primary-token)]">Free Plan</span>
            </div>
            <p className="mb-3 text-xs text-[var(--text-muted-token)]">
              3 reports remaining this month
            </p>
            <Link to="/pricing">
              <Button size="sm" className="w-full rounded bg-[var(--accent-token)] text-xs font-bold text-[var(--button-primary-text)] hover:bg-[var(--accent-hover)] active:scale-[0.98]">
                Upgrade to Premium
              </Button>
            </Link>
          </div>
        )}

        {/* Bottom actions */}
        <div className="space-y-0.5 border-t border-[var(--border-token)] p-3">
          <ThemeToggle collapsed={collapsed} />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[var(--text-muted-token)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary-token)]"
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Log Out</span>}
          </button>
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-token)] bg-[var(--bg-card)] shadow-sm hover:bg-[var(--bg-surface)]"
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
          "flex-1 transition-all duration-200 min-h-screen pt-12",
          collapsed ? "ml-[76px]" : "ml-[260px]"
        )}
      >
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
