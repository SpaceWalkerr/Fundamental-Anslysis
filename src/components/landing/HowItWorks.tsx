import { motion } from "framer-motion";
import { Upload, Cpu, FileText, MessageSquare } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Upload Financial Data",
    description:
      "Upload annual reports, 10-K filings, or quarterly statements in PDF, Excel, or CSV format.",
  },
  {
    step: "02",
    icon: Cpu,
    title: "AI Processes & Analyzes",
    description:
      "Our AI extracts key metrics, calculates ratios, and performs comprehensive fundamental analysis.",
  },
  {
    step: "03",
    icon: FileText,
    title: "Review Your Report",
    description:
      "Get a detailed analysis including financial health, red flags, strengths, and investment assessment.",
  },
  {
    step: "04",
    icon: MessageSquare,
    title: "Ask Questions",
    description:
      "Use the Q&A feature to dive deeper into any aspect of the analysis with contextual AI responses.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 md:py-32">
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
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-foreground mt-3 mb-4">
            From Upload to Insight
            <br />
            <span className="gradient-text">In Minutes</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get institutional-grade analysis without the institutional price tag.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative"
              >
                <div className="relative z-10 flex flex-col items-center text-center">
                  {/* Step Number */}
                  <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-6 shadow-glow">
                    <step.icon className="w-7 h-7 text-primary-foreground" />
                  </div>

                  {/* Step Label */}
                  <span className="text-xs font-medium text-primary uppercase tracking-wider mb-2">
                    Step {step.step}
                  </span>

                  {/* Title */}
                  <h3 className="text-xl font-serif font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
