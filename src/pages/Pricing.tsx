import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { usePlanStore, billingFor } from "@/store/usePlanStore";
import { formatPrice } from "@/lib/currency";
import { useRegion } from "@/hooks/use-region";

export default function Pricing() {
  const navigate = useNavigate();
  const openUpgrade = usePlanStore((s) => s.openUpgrade);
  const isPro = usePlanStore((s) => s.isPro)();
  const { region } = useRegion();
  const bp = billingFor(region);

  const plansData = [
    {
      name: "Free",
      description: "Perfect for getting started",
      price: formatPrice(0, bp.currency),
      period: "forever",
      subprice: "",
      features: [
        "5 AI reports per month",
        "PDF upload support",
        "Basic financial metrics",
        "Report history",
        "Email support",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Premium",
      description: "For serious investors",
      price: formatPrice(bp.monthly, bp.currency),
      period: "/month",
      subprice: `or ${formatPrice(bp.yearly, bp.currency)}/year — save 33%`,
      features: [
        "Unlimited AI reports",
        "PDF, Excel, CSV support",
        "Advanced ratio analysis",
        "Interactive Q&A",
        "Stock screener access",
        "Unlimited history",
        "PDF report exports",
        "Priority support",
      ],
      cta: "Start Premium",
      popular: true,
    },
    {
      name: "Enterprise",
      description: "For teams & institutions",
      price: "Custom",
      period: "",
      subprice: "",
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

  const handleCta = (planName: string) => {
    if (planName === "Free") {
      navigate("/dashboard");
    } else if (planName === "Premium") {
      if (isPro) {
        navigate("/dashboard");
      } else {
        openUpgrade("general");
      }
    } else {
      // Enterprise — route to contact / mailto
      window.location.href = "mailto:sales@fundakamental.in?subject=Enterprise%20plan%20enquiry";
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-24 bg-white/50 min-h-screen">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-3 mb-4">
            Simple, Transparent
            <br />
            <span className="text-primary">Pricing</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start free and upgrade when you are ready. No hidden fees.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plansData.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-2xl p-8 bg-white ${
                plan.popular
                  ? "border-2 border-primary shadow-lg"
                  : "border border-border"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-white text-sm font-medium flex items-center gap-1 w-max">
                  <Sparkles className="w-4 h-4" />
                  Most Popular
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                {plan.subprice && (
                  <p className="text-xs text-primary font-medium mt-2">{plan.subprice}</p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                onClick={() => handleCta(plan.name)}
                className={`w-full rounded-full ${
                  plan.popular
                    ? "bg-primary hover:bg-primary/90 text-white"
                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                }`}
                size="lg"
              >
                {plan.name === "Premium" && isPro ? "Current Plan" : plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

