import { Check, Sparkles, X, ShieldCheck, Coins } from "lucide-react";
import {
  usePlanStore,
  billingFor,
  PLAN_ID,
  MONTHLY_GRANTS,
  formatTokens,
  type UpgradeReason,
} from "@/store/usePlanStore";
import { formatPrice } from "@/lib/currency";
import { useRegion } from "@/hooks/use-region";
import RegionSwitcher from "@/components/RegionSwitcher";

// Benefit-led, loss-framed copy per locked context.
const REASON_COPY: Record<UpgradeReason, { title: string; sub: string }> = {
  reports: {
    title: "You've used your free reports this month",
    sub: "Pro gives you unlimited AI research reports — analyse every company on your watchlist, not just five.",
  },
  screener: {
    title: "Find winners before the crowd",
    sub: "The Pro screener filters thousands of stocks by 50+ fundamentals — P/E, ROE, margins, growth — in one query.",
  },
  technicals: {
    title: "See the full technical picture",
    sub: "Unlock advanced indicators and signals that Pro members use to time their entries.",
  },
  export: {
    title: "Take your research with you",
    sub: "Export polished PDF reports for your own records, your clients, or your investment committee.",
  },
  qa: {
    title: "Ask the analyst anything",
    sub: "Pro's interactive Q&A reads the actual filing and answers follow-ups in seconds — like a junior analyst on call.",
  },
  watchlist: {
    title: "Track everything you're watching",
    sub: "Unlimited watchlists and live alerts keep you on top of every position that matters.",
  },
  portfolio: {
    title: "Understand your whole portfolio",
    sub: "Pro portfolio analytics reveal concentration, risk and quality across all your holdings at once.",
  },
  general: {
    title: "Research like an institution",
    sub: "Unlimited reports, the full screener, advanced technicals and PDF exports — the complete toolkit.",
  },
};

const PRO_FEATURES = [
  "Unlimited AI research reports",
  "Full stock screener (50+ filters)",
  "Advanced technical indicators",
  "Interactive Q&A on any filing",
  "Unlimited watchlists & alerts",
  "Portfolio analytics",
  "PDF, Excel & CSV uploads",
  "Beautiful PDF report exports",
];

export default function UpgradeModal() {
  const {
    upgradeOpen,
    upgradeReason,
    closeUpgrade,
    billing,
    setBilling,
    checkoutBusy,
    startCheckout,
  } = usePlanStore();
  const { region } = useRegion();

  if (!upgradeOpen) return null;

  const copy = REASON_COPY[upgradeReason] || REASON_COPY.general;
  const bp = billingFor(region);
  const price = billing === "yearly" ? bp.yearly : bp.monthly;
  const monthlyEquivalent =
    billing === "yearly" ? Math.round(price / 12) : price;
  const perDay = billing === "yearly" ? bp.perDayYearly : bp.perDayMonthly;
  const yearlySaves = billing === "yearly";

  return (
    <div
      className="fixed inset-0 z-[10060] flex items-center justify-center p-4 bg-[#0E1B2E]/60 backdrop-blur-sm overflow-y-auto"
      onClick={closeUpgrade}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-7 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeUpgrade}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary text-muted-foreground hover:bg-muted flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> FundaKaMental Pro
          </span>
          <h2 className="text-2xl font-bold text-foreground">{copy.title}</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {copy.sub}
          </p>
        </div>

        {/* Region + billing toggles */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <RegionSwitcher />
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-3 py-1.5 text-sm font-semibold ${
                billing === "monthly"
                  ? "bg-foreground text-white"
                  : "bg-white text-muted-foreground hover:bg-secondary"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-3 py-1.5 text-sm font-semibold flex items-center gap-1.5 ${
                billing === "yearly"
                  ? "bg-foreground text-white"
                  : "bg-white text-muted-foreground hover:bg-secondary"
              }`}
            >
              Yearly
              <span className="text-[10px] font-bold text-white bg-primary rounded-full px-1.5 py-0.5">
                SAVE 33%
              </span>
            </button>
          </div>
        </div>

        {/* Price */}
        <div className="text-center mb-5">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-foreground">
              {formatPrice(monthlyEquivalent, bp.currency)}
            </span>
            <span className="text-muted-foreground">/mo</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {yearlySaves
              ? `${formatPrice(price, bp.currency)} billed yearly — about ${perDay}`
              : `About ${perDay} · cancel anytime`}
          </p>
        </div>

        {/* Token allowance — the concrete "what you're paying for" */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Coins className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="text-muted-foreground">Monthly AI tokens: </span>
            <span className="font-semibold text-foreground">{formatTokens(MONTHLY_GRANTS.free)}</span>
            <span className="text-muted-foreground"> on Free → </span>
            <span className="font-bold text-primary">{formatTokens(MONTHLY_GRANTS.premium)}</span>
            <span className="text-muted-foreground"> on Pro</span>
          </div>
          <span className="text-xs font-extrabold text-primary bg-primary/10 rounded-full px-2 py-1 whitespace-nowrap">
            {Math.round(MONTHLY_GRANTS.premium / MONTHLY_GRANTS.free)}× more
          </span>
        </div>

        {/* Features */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={() => startCheckout(PLAN_ID[billing])}
          disabled={checkoutBusy}
          className="w-full py-3 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-wait shadow-lg shadow-primary/25"
        >
          {checkoutBusy ? "Opening secure checkout…" : "Upgrade to Pro"}
        </button>

        {/* Anchor + trust */}
        <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
          {bp.advisor}. Pro is a fraction of that — and it works for you around the clock.
        </p>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mt-3">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          Secure payments via Razorpay · Cancel anytime · Your data stays yours
        </p>
      </div>
    </div>
  );
}
