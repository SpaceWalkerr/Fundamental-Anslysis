import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X, User, ChevronDown } from "lucide-react";
import Logo from "@/components/brand/Logo";
import RegionSwitcher from "@/components/RegionSwitcher";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: "HOME", href: "/" },
    { name: "FEATURES", href: "/#features" },
    { name: "HOW IT WORKS", href: "/#how-it-works" },
    { name: "PRICING", href: "/#pricing" },
  ];

  return (
    <header className="absolute top-0 left-0 right-0 z-50 bg-transparent">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex items-center justify-between h-20">
          {/* Left Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="mr-4">
              <Logo size="sm" />
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-[13px] font-semibold tracking-wide text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </nav>
          </div>

          {/* Right Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <RegionSwitcher />
            <Link to="/login">
              <Button variant="outline" className="text-zinc-600 border-zinc-200 hover:bg-white text-[13px] font-semibold tracking-wide px-4 h-[38px] rounded shadow-sm bg-white">
                <User className="w-4 h-4 mr-2" />
                LOGIN
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-primary border border-primary text-white hover:bg-primary/90 text-[13px] font-semibold tracking-wide px-5 h-[38px] rounded shadow-sm">
                GET FREE ACCOUNT
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-zinc-600"
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
            className="md:hidden py-4 border-t border-border bg-white"
          >
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-zinc-600 hover:text-black hover:bg-zinc-50 transition-colors text-sm font-medium px-4 py-3 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-4 mt-2 border-t border-border px-4">
                <div className="flex justify-start"><RegionSwitcher /></div>
                <Link to="/login">
                  <Button variant="outline" className="w-full justify-center">
                    <User className="w-4 h-4 mr-2" /> LOGIN
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="w-full bg-primary text-white border border-primary hover:bg-primary/90">
                    GET FREE ACCOUNT
                  </Button>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  );
};

export default Header;

