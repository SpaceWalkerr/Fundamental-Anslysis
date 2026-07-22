import { X, Coins, Check } from "lucide-react";
import {
  usePlanStore,
  TOKEN_PACKS,
  billingFor,
  formatTokens,
  type TokenPackId,
} from "@/store/usePlanStore";
import { formatPrice } from "@/lib/currency";
import { useRegion } from "@/hooks/use-region";
import RegionSwitcher from "@/components/RegionSwitcher";

/**
 * Top-up pack purchase modal. Shown to Pro users who exhaust their monthly
 * token allowance and want to keep going without waiting for the reset.
 */
export default function BuyTokensModal() {
  const {
    buyTokensOpen,
    closeBuyTokens,
    checkoutBusy,
    buyTokenPack,
    wallet,
  } = usePlanStore();
  const { region } = useRegion();
  const bp = billingFor(region);

  if (!buyTokensOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10060] flex items-center justify-center p-4 bg-[#0E1B2E]/60 backdrop-blur-sm overflow-y-auto"
      onClick={closeBuyTokens}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-7 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeBuyTokens}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary text-muted-foreground hover:bg-muted flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
            <Coins className="w-3.5 h-3.5" /> AI tokens
          </span>
          <h2 className="text-2xl font-bold text-foreground">Top up your tokens</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {wallet
              ? `You have ${formatTokens(wallet.balance)} left. Add more — they never expire.`
              : "Add tokens that never expire."}
          </p>
        </div>

        {/* Region / currency */}
        <div className="flex items-center justify-center mb-5">
          <RegionSwitcher />
        </div>

        {/* Packs */}
        <div className="space-y-3">
          {TOKEN_PACKS.map((pack, i) => (
            <button
              key={pack.id}
              disabled={checkoutBusy}
              onClick={() => buyTokenPack(pack.id as TokenPackId)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all disabled:opacity-60 ${
                i === 1
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Coins className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{formatTokens(pack.tokens)} tokens</span>
                  {i === 1 && (
                    <span className="text-[10px] font-extrabold text-white bg-primary rounded-full px-2 py-0.5">
                      POPULAR
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{pack.label}</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {formatPrice(bp.packs[pack.id], bp.currency)}
              </span>
            </button>
          ))}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mt-5">
          <Check className="w-3.5 h-3.5 text-primary" />
          One-time purchase · tokens never expire · secure via Razorpay
        </p>
      </div>
    </div>
  );
}
