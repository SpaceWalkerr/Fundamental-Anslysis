import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp,
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.2 }}
        className="fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border flex flex-col z-40"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-serif text-lg font-semibold text-sidebar-foreground">
                FundaVision
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors relative group",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="font-medium">{item.name}</span>
                    {item.premium && (
                      <Sparkles className="w-4 h-4 text-warning ml-auto" />
                    )}
                  </>
                )}
                {collapsed && item.premium && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-warning" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Tier Badge */}
        {!collapsed && (
          <div className="mx-3 mb-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Free Plan</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              3 reports remaining this month
            </p>
            <Button size="sm" className="w-full bg-gradient-primary text-xs">
              Upgrade to Premium
            </Button>
          </div>
        )}

        {/* Logout */}
        <div className="p-3 border-t border-sidebar-border">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">Log Out</span>}
          </Link>
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center hover:bg-sidebar-accent/80 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-sidebar-foreground" />
          )}
        </button>
      </motion.aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 transition-all duration-200",
          collapsed ? "ml-20" : "ml-[280px]"
        )}
      >
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
