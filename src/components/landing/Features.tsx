import { motion } from "framer-motion";
import {
  Upload,
  Brain,
  MessageSquare,
  Filter,
  TrendingUp,
  Shield,
  Clock,
  FileText,
} from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Multi-Format Upload",
    description:
      "Upload PDF annual reports, Excel financial statements, or CSV data files. Our parser extracts and structures the data automatically.",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description:
      "Advanced LLM technology analyzes your documents and generates comprehensive fundamental analysis reports in seconds.",
  },
  {
    icon: MessageSquare,
    title: "Interactive Q&A",
    description:
      "Ask follow-up questions about any analysis. Get instant, contextual answers backed by your financial data.",
  },
  {
    icon: Filter,
    title: "Stock Screener",
    description:
      "Build custom filters to screen stocks by P/E ratio, revenue growth, margins, and 50+ other financial metrics.",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Data",
    description:
      "Access live stock prices, market caps, and key ratios pulled from trusted financial data providers.",
  },
  {
    icon: FileText,
    title: "Export Reports",
    description:
      "Download professional PDF reports for presentations, client meetings, or personal reference.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Enterprise-grade encryption protects your documents. Your data is never shared or used for training.",
  },
  {
    icon: Clock,
    title: "Report History",
    description:
      "Access all your past analyses anytime. Compare reports across different time periods.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 md:py-32 bg-card/50">
      <div className="container px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-foreground mt-3 mb-4">
            Everything You Need for
            <br />
            <span className="gradient-text">Smart Investing</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From document parsing to AI analysis, we provide all the tools
            professional investors need.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 data-card"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
