import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "fkm-theme";

type Theme = "dark" | "light";

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "light" ? "light" : "dark";
};

export const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
};

interface ThemeToggleProps {
  collapsed?: boolean;
  className?: string;
}

const ThemeToggle = ({ collapsed = false, className }: ThemeToggleProps) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const isLight = theme === "light";

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[var(--text-muted-token)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary-token)]",
        collapsed && "justify-center",
        className
      )}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
    >
      {isLight ? (
        <Sun className="h-[18px] w-[18px] flex-shrink-0" />
      ) : (
        <Moon className="h-[18px] w-[18px] flex-shrink-0" />
      )}
      {!collapsed && <span className="text-sm font-medium">{isLight ? "Light Mode" : "Dark Mode"}</span>}
    </button>
  );
};

export default ThemeToggle;
