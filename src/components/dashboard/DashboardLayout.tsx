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
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Logo, { LogoMark } from "@/components/brand/Logo";
import { useAuthStore } from "@/store/useAuthStore";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

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

interface SidebarContentProps {
  collapsed: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
}

const SidebarContent = ({
  collapsed,
  onNavigate,
  onLogout,
}: SidebarContentProps) => {
  const location = useLocation();

  return (
    <>
      <div className="h-16 flex items-center px-4 border-b border-border">
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5"
          onClick={onNavigate}
        >
          {collapsed ? <LogoMark size={36} /> : <Logo size="md" />}
        </Link>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const linkElement = (
            <Link
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group w-full",
                isActive
                  ? "bg-accent text-primary font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              <item.icon
                className={cn(
                  "w-[18px] h-[18px] flex-shrink-0 transition-colors",
                  isActive && "text-primary"
                )}
              />
              {!collapsed && (
                <>
                  <span className="text-sm">{item.name}</span>
                  {item.premium && (
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 ml-auto" />
                  )}
                </>
              )}
              {collapsed && item.premium && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.name} delayDuration={100}>
                <TooltipTrigger asChild>{linkElement}</TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="flex items-center gap-1.5 font-medium text-xs"
                >
                  {item.name}
                  {item.premium && (
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.name}>{linkElement}</div>;
        })}
      </nav>

      {!collapsed && <div className="mx-4 my-2 h-px bg-border" />}

      {collapsed ? (
        <div className="mx-auto mb-4">
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Link to="/pricing" onClick={onNavigate}>
                <div className="w-10 h-10 rounded-xl bg-accent border border-primary/20 flex items-center justify-center relative cursor-pointer hover:bg-accent-foreground/5 transition-colors">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                    3
                  </span>
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px] p-2.5">
              <p className="font-semibold text-xs text-foreground mb-1">
                Free Plan
              </p>
              <p className="text-[11px] text-muted-foreground mb-2">
                3 reports remaining this month.
              </p>
              <span className="text-[10px] text-primary font-bold">
                Upgrade to Premium
              </span>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="mx-3 mb-3 p-4 rounded-2xl bg-accent border border-primary/10">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Free Plan
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            3 reports remaining this month
          </p>
          <Link to="/pricing" onClick={onNavigate}>
            <Button
              size="sm"
              className="w-full bg-primary hover:bg-primary/90 text-white text-xs rounded-full font-medium"
            >
              Upgrade to Premium
            </Button>
          </Link>
        </div>
      )}

      <div className="p-3 border-t border-border space-y-0.5">
        {collapsed ? (
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center p-2.5 rounded-xl text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium text-xs">
              Log Out
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        )}
      </div>
    </>
  );
};

const DashboardLayout = ({ children }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const closeMobileNav = () => setMobileOpen(false);

  const sidebarWidth = isMobile ? 0 : collapsed ? 76 : 260;

  return (
    <div className="min-h-screen bg-secondary/30 flex">
      {/* Desktop sidebar — hidden below md via CSS to avoid mobile layout shift */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 260 }}
        transition={{ duration: 0.2 }}
        className="fixed left-0 top-0 h-full bg-white border-r border-border hidden md:flex flex-col z-40"
      >
        <SidebarContent collapsed={collapsed} onLogout={handleLogout} />

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center hover:bg-accent transition-colors shadow-sm"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      </motion.aside>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SidebarContent
            collapsed={false}
            onNavigate={closeMobileNav}
            onLogout={() => {
              closeMobileNav();
              handleLogout();
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.2 }}
        className="flex-1 min-h-screen w-full min-w-0"
      >
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-white/90 backdrop-blur-md border-b border-border md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-1 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/dashboard" className="flex items-center">
              <Logo size="sm" />
            </Link>
            <div className="w-9" aria-hidden="true" />
        </header>
        {children}
      </motion.main>
    </div>
  );
};

export default DashboardLayout;
