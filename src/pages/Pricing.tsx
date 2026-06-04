import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const plansData = [
  {
    name: "Free",
    description: "Perfect for getting started",
    price: "$0",
    inrPrice: "₹0",
    period: "forever",
    features: [
      "5 reports per month",
      "PDF upload support",
      "Basic financial metrics",
      "7-day report history",
      "Email support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Premium",
    description: "For serious investors",
    price: "$29",
    inrPrice: "₹2,499",
    period: "/month",
    features: [
      "Unlimited reports",
      "PDF, Excel, CSV support",
      "Advanced ratio analysis",
      "Interactive Q&A",
      "Stock screener access",
      "Unlimited history",
      "Export to PDF",
      "Priority support",
    ],
    cta: "Start Premium",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For teams & institutions",
    price: "Custom",
    inrPrice: "Custom",
    period: "",
    features: [
      "Everything in Premium",
      "API access",
      "Team collaboration",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "On-premise deployment",
      "Custom training",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="px-4 py-16 md:py-24 min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 max-w-2xl mx-auto"
        >
          <span
            className="font-medium"
            style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.15em" }}
          >
            Pricing
          </span>
          <h2 className="font-poppins font-bold mt-3 mb-4" style={{ fontSize: 40, color: "#111625", lineHeight: 1.15 }}>
            Simple, Transparent
            <br />
            <span style={{ color: "#00AA5B" }}>Pricing</span>
          </h2>
          <p style={{ fontSize: 15, color: "#64748B", lineHeight: 1.6 }}>
            Start free and upgrade when you're ready. No hidden fees.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto" style={{ gap: 24 }}>
          {plansData.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative bg-white flex flex-col"
              style={{
                borderRadius: 12,
                padding: 32,
                border: plan.popular ? "2px solid #00AA5B" : "1px solid #E2E8F0",
                boxShadow: plan.popular ? "0 8px 22px rgba(15,23,42,0.08)" : "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 text-white font-medium"
                  style={{ top: -16, borderRadius: 999, backgroundColor: "#00AA5B", fontSize: 13 }}
                >
                  <Sparkles className="w-4 h-4" />
                  Most Popular
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="font-poppins font-semibold mb-2" style={{ fontSize: 20, color: "#111625" }}>
                  {plan.name}
                </h3>
                <p className="mb-4" style={{ fontSize: 14, color: "#64748B" }}>
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-poppins font-bold" style={{ fontSize: 40, color: "#111625" }}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span style={{ fontSize: 16, color: "#64748B" }}>{plan.period}</span>
                  )}
                </div>
                {plan.inrPrice !== "Custom" && (
                  <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                    ≈ {plan.inrPrice}{plan.period === "/month" ? "/month" : ""}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="flex-1 mb-8" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {plan.features.map((feature, fi) => (
                  <li key={fi} className="flex items-start gap-3" style={{ fontSize: 14, color: "#4B5563" }}>
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#00AA5B" }} />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                onClick={() => navigate("/dashboard")}
                className="w-full font-medium transition-all"
                size="lg"
                style={
                  plan.popular
                    ? { backgroundColor: "#00AA5B", color: "#FFFFFF", borderRadius: 8, fontSize: 15 }
                    : { backgroundColor: "transparent", color: plan.name === "Free" ? "#00AA5B" : "#4B5563", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 15 }
                }
                onMouseEnter={(e) => {
                  if (!plan.popular) {
                    (e.currentTarget as HTMLElement).style.borderColor = "#00AA5B";
                    (e.currentTarget as HTMLElement).style.color = "#00AA5B";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!plan.popular) {
                    (e.currentTarget as HTMLElement).style.borderColor = "#E2E8F0";
                    (e.currentTarget as HTMLElement).style.color = plan.name === "Free" ? "#00AA5B" : "#4B5563";
                  }
                }}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
