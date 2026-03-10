import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, FileSpreadsheet, LayoutGrid, CheckCircle, Shield, Users } from "lucide-react";
import { GrowthChartIllustration } from "@/components/brand/Illustrations";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20 bg-gradient-hero">
      {/* Subtle background circles like Xtin Capital */}
      <div className="absolute top-1/2 right-[10%] -translate-y-1/3 w-[500px] h-[500px] rounded-full bg-primary/5 blur-xl" />
      <div className="absolute top-1/2 right-[15%] -translate-y-1/4 w-[350px] h-[350px] rounded-full bg-primary/8 blur-sm" />

      {/* Content */}
      <div className="container relative z-10 px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Text Content */}
          <div>
            {/* Badge — like Xtin's "Building for Everyone" */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-primary/10 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-medium text-primary">
                AI-Powered Analysis
              </span>
            </motion.div>

            {/* Headline — clean, bold, Xtin style */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] text-balance"
            >
              Institutional-Grade{" "}
              <span className="text-primary">Fundamental Analysis</span>{" "}
              for Everyone
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-10 max-w-lg leading-relaxed"
            >
              Simple, powerful financial tools designed for everyone. 
              Where technology meets simplicity to grow your wealth.
            </motion.p>

            {/* CTAs — Green button + outline, like Xtin */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start gap-4 mb-12"
            >
              <Link to="/register">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white text-base px-8 h-13 rounded-full font-medium gap-2 shadow-md">
                  Explore Tools
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-base px-8 h-13 rounded-full gap-2 border-border font-medium">
                Join Community
              </Button>
            </motion.div>

            {/* Trust badges — like Xtin's "Free to Use · 100% Secure · 50K+ Users" */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap items-center gap-6"
            >
              {[
                { icon: CheckCircle, text: "Free to Use", color: "text-primary" },
                { icon: Shield, text: "100% Secure", color: "text-primary" },
                { icon: Users, text: "50K+ Users" },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 ${item.color || 'text-muted-foreground'}`} />
                  <span className="text-sm text-muted-foreground">{item.text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Visual Dashboard Preview (floating cards like Xtin) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="hidden lg:block relative"
          >
            {/* Central chart illustration */}
            <div className="relative w-[400px] h-[400px] mx-auto">
              <div className="absolute inset-8 rounded-3xl bg-primary/5 border border-primary/10" />
              <div className="absolute inset-12 flex items-center justify-center">
                <GrowthChartIllustration size={320} />
              </div>

              {/* Floating cards around the circle */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 right-8 bg-white rounded-xl shadow-lg border border-border p-3 flex items-center gap-3"
              >
                <LayoutGrid className="w-5 h-5 text-muted-foreground" />
              </motion.div>

              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute top-4 -right-4 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg"
              >
                +24.5%
              </motion.div>

              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-1/3 -left-8 bg-white rounded-xl shadow-lg border border-border p-3"
              >
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
                className="absolute top-1/3 -right-8 bg-white rounded-xl shadow-lg border border-border p-3"
              >
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </motion.div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-border p-3"
              >
                <BarChart3 className="w-5 h-5 text-primary" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
