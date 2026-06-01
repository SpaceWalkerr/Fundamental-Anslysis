import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X, User } from "lucide-react";
import Logo from "@/components/brand/Logo";
import LiveTickerBar from "@/components/LiveTickerBar";
import ThemeToggle from "@/components/ThemeToggle";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: "HOME", href: "/" },
    { name: "LEARN", href: "/learn" },
  ];

  return (
    <header className="app-shell absolute left-0 right-0 top-0 z-50 bg-[var(--bg-primary)] text-[var(--text-primary-token)] shadow-[0_1px_0_var(--border-token)]">
      <LiveTickerBar />
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-14">
          {/* Left Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="mr-4">
              <Logo size="sm" variant="white" />
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-[11px] font-semibold tracking-[0.14em] text-[var(--text-muted-token)] hover:text-[var(--accent-token)]"
                >
                  {link.name}
                </a>
              ))}
            </nav>
          </div>

          {/* Right Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline" className="h-9 rounded border-[var(--border-token)] bg-transparent px-4 text-[11px] font-semibold tracking-[0.14em] text-[var(--text-primary-token)] hover:bg-[var(--bg-surface)]">
                <User className="w-4 h-4 mr-2" />
                LOGIN
              </Button>
            </Link>
            <Link to="/register">
              <Button className="h-9 rounded bg-[var(--accent-token)] px-5 text-[11px] font-bold tracking-[0.14em] text-[var(--button-primary-text)] hover:bg-[var(--accent-hover)] active:scale-[0.98]">
                GET FREE ACCOUNT
              </Button>
            </Link>
            <div className="w-36">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="p-2 text-[var(--text-primary-token)] md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[var(--border-token)] bg-[var(--bg-primary)] py-4 md:hidden"
          >
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-[var(--text-muted-token)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary-token)]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-3 border-t border-[var(--border-token)] px-4 pt-4">
                <Link to="/login">
                  <Button variant="outline" className="w-full justify-center border-[var(--border-token)] bg-transparent text-[var(--text-primary-token)] hover:bg-[var(--bg-surface)]">
                    <User className="w-4 h-4 mr-2" /> LOGIN
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="w-full bg-[var(--accent-token)] text-[var(--button-primary-text)] hover:bg-[var(--accent-hover)]">
                    GET FREE ACCOUNT
                  </Button>
                </Link>
                <ThemeToggle />
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  );
};

export default Header;
