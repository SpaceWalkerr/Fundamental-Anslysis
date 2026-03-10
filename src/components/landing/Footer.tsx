import { Link } from "react-router-dom";
import { Twitter, Linkedin, Github } from "lucide-react";
import Logo from "@/components/brand/Logo";

const Footer = () => {
  const footerLinks = {
    Product: [
      { name: "Features", href: "#features" },
      { name: "Pricing", href: "#pricing" },
      { name: "API", href: "#" },
      { name: "Integrations", href: "#" },
    ],
    Company: [
      { name: "About", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Contact", href: "#" },
    ],
    Resources: [
      { name: "Documentation", href: "#" },
      { name: "Help Center", href: "#" },
      { name: "Community", href: "#" },
      { name: "Status", href: "#" },
    ],
    Legal: [
      { name: "Privacy", href: "#" },
      { name: "Terms", href: "#" },
      { name: "Security", href: "#" },
      { name: "Cookies", href: "#" },
    ],
  };

  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="container px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Logo size="lg" />
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Institutional-grade fundamental analysis powered by AI. Make smarter
              investment decisions.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors"
              >
                <Twitter className="w-5 h-5 text-muted-foreground" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors"
              >
                <Linkedin className="w-5 h-5 text-muted-foreground" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors"
              >
                <Github className="w-5 h-5 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </a>
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
