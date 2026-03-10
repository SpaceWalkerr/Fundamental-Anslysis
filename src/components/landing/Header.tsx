import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import Logo from "@/components/brand/Logo";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: "Platform", href: "#features" },
    { name: "Tools", href: "#how-it-works" },
    { name: "Pricing", href: "#pricing" },
    { name: "Learn", href: "#" },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/50"
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-[72px]">
          {/* Logo — Xtin Capital style */}
          <Link to="/">
            <Logo size="md" />
          </Link>

          {/* Desktop Navigation — clean, spaced links like Xtin */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link, i) => (
              <a
                key={link.name}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  i === 0 ? "text-primary" : "text-foreground/70 hover:text-foreground"
                }`}
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Desktop CTA — Login + green Signup like Xtin */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-foreground/70 hover:text-foreground font-medium">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 font-medium">
                Signup
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
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
            className="md:hidden py-4 border-t border-border"
          >
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-foreground/70 hover:text-foreground hover:bg-accent transition-colors text-sm font-medium px-3 py-2.5 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-border">
                <Link to="/login">
                  <Button variant="ghost" className="w-full justify-center">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-full">
                    Signup
                  </Button>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
