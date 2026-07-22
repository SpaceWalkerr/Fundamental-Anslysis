import { Link } from "react-router-dom";
import Logo from "@/components/brand/Logo";

// Only real destinations: landing-section anchors (internal) and the live
// Xtin Capital pages (external). No dead placeholder links.
const footerLinks: Record<string, { name: string; href: string; external?: boolean }[]> = {
  Product: [
    { name: "Features", href: "#features" },
    { name: "How it works", href: "#how-it-works" },
    { name: "Pricing", href: "#pricing" },
  ],
  Account: [
    { name: "Log in", href: "/login" },
    { name: "Get started", href: "/register" },
  ],
  Company: [
    { name: "About", href: "https://xtincapital.com/about", external: true },
    { name: "Help Center", href: "https://xtincapital.com/help", external: true },
  ],
  Legal: [
    { name: "Privacy", href: "https://xtincapital.com/privacy", external: true },
    { name: "Terms", href: "https://xtincapital.com/terms", external: true },
  ],
};

const Footer = () => {

  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="container px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Logo size="lg" />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Institutional-grade fundamental analysis powered by AI. Make smarter
              investment decisions.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith("/") ? (
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.name}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noreferrer" : undefined}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 FundaKaMental. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Analysis for educational purposes only. Not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
