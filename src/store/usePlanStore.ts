import { create } from "zustand";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { getRegion, getRegionConfig, type Currency, type RegionCode } from "@/lib/region";

/**
 * Pro plan state for FundaKaMental.
 *
 * The source of truth for entitlement is the authenticated user's `plan`
 * (free | premium | enterprise), which the backend serves from Supabase and
 * only upgrades server-side after a verified Razorpay payment. This store owns
 * the regional pricing catalogue, the upgrade-modal UI state, and checkout.
 */

export type BillingCycle = "monthly" | "yearly";
export const PLAN_ID: Record<BillingCycle, "pro_monthly" | "pro_yearly"> = {
  monthly: "pro_monthly",
  yearly: "pro_yearly",
};

// A region's billing profile: the currency we charge + charm price points.
// Must match backend PRO_PLANS/TOKEN_PACKS amounts (in smallest unit /100).
interface BillingProfile {
  currency: Currency;
  monthly: number;
  yearly: number;
  packs: Record<TokenPackId, number>;   // display price per pack
  perDayMonthly: string;
  perDayYearly: string;
  advisor: string;                       // human-advisor cost anchor
}

const USD_PROFILE: BillingProfile = {
  currency: "USD", monthly: 9, yearly: 59,
  packs: { pack_small: 3, pack_medium: 7, pack_large: 15 },
  perDayMonthly: "$0.30/day", perDayYearly: "$0.16/day",
  advisor: "A financial advisor typically charges $1,500–3,000 a year",
};

const BILLING: Record<RegionCode, BillingProfile> = {
  IN: {
    currency: "INR", monthly: 499, yearly: 3999,
    packs: { pack_small: 199, pack_medium: 499, pack_large: 999 },
    perDayMonthly: "₹16/day", perDayYearly: "₹11/day",
    advisor: "A financial advisor typically charges ₹10,000–25,000 a year",
  },
  GB: {
    currency: "GBP", monthly: 7, yearly: 49,
    packs: { pack_small: 2, pack_medium: 5, pack_large: 11 },
    perDayMonthly: "£0.23/day", perDayYearly: "£0.13/day",
    advisor: "A financial adviser typically charges £1,000–2,000 a year",
  },
  EU: {
    currency: "EUR", monthly: 8, yearly: 55,
    packs: { pack_small: 3, pack_medium: 6, pack_large: 13 },
    perDayMonthly: "€0.26/day", perDayYearly: "€0.15/day",
    advisor: "A financial advisor typically charges €1,200–2,500 a year",
  },
  US: USD_PROFILE,
  AE: { ...USD_PROFILE },
  SG: { ...USD_PROFILE },
  GLOBAL: { ...USD_PROFILE },
};

export function billingFor(region?: RegionCode): BillingProfile {
  return BILLING[region || getRegion()] || USD_PROFILE;
}

export type UpgradeReason =
  | "reports"
  | "screener"
  | "technicals"
  | "export"
  | "qa"
  | "watchlist"
  | "portfolio"
  | "general";

interface PlanState {
  billing: BillingCycle;
  upgradeOpen: boolean;
  upgradeReason: UpgradeReason;
  checkoutBusy: boolean;
  celebrating: boolean;
  setBilling: (b: BillingCycle) => void;
  openUpgrade: (reason?: UpgradeReason) => void;
  closeUpgrade: () => void;
  isPro: () => boolean;
  /** Free users get a monthly report quota; Pro is unlimited. */
  canUseReport: () => boolean;
  startCheckout: (planId: "pro_monthly" | "pro_yearly") => Promise<void>;
  refreshPlan: () => Promise<void>;
  // --- AI token wallet ---
  wallet: TokenWallet | null;
  buyTokensOpen: boolean;
  fetchWallet: () => Promise<void>;
  openBuyTokens: () => void;
  closeBuyTokens: () => void;
  buyTokenPack: (packId: TokenPackId) => Promise<void>;
}

export interface TokenWallet {
  balance: number;
  monthly_balance: number;
  monthly_grant: number;
  topup_balance: number;
  tier: string;
  grants?: Record<string, number>;
}

export type TokenPackId = "pack_small" | "pack_medium" | "pack_large";

// Top-up pack sizes (must match backend TOKEN_PACKS). Prices come from the
// region's billing profile via billingFor().packs[id].
export const TOKEN_PACKS: { id: TokenPackId; tokens: number; label: string }[] = [
  { id: "pack_small", tokens: 200_000, label: "Starter" },
  { id: "pack_medium", tokens: 500_000, label: "Popular" },
  { id: "pack_large", tokens: 1_200_000, label: "Best value" },
];

// Monthly token allowances by tier (must match backend MONTHLY_GRANT).
export const MONTHLY_GRANTS = { free: 60_000, premium: 500_000 };

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.max(0, Math.round(n)));
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export const usePlanStore = create<PlanState>((set, get) => ({
  billing: "yearly",
  upgradeOpen: false,
  upgradeReason: "general",
  checkoutBusy: false,
  celebrating: false,
  wallet: null,
  buyTokensOpen: false,

  setBilling: (b) => set({ billing: b }),
  openUpgrade: (reason = "general") => set({ upgradeOpen: true, upgradeReason: reason }),
  closeUpgrade: () => set({ upgradeOpen: false }),

  isPro: () => {
    const plan = useAuthStore.getState().user?.plan;
    return plan === "premium" || plan === "enterprise";
  },

  canUseReport: () => {
    if (get().isPro()) return true;
    const u = useAuthStore.getState().user;
    return (u?.reportsUsed ?? 0) < (u?.reportsLimit ?? 5);
  },

  refreshPlan: async () => {
    try {
      const res: any = await api.razorpay.getPlan();
      const authUser = useAuthStore.getState().user;
      if (authUser && res?.plan && res.plan !== authUser.plan) {
        useAuthStore.getState().patchUser({ plan: res.plan });
      }
    } catch {
      /* offline / not logged in — keep current */
    }
  },

  fetchWallet: async () => {
    try {
      const w: any = await api.tokens.getWallet();
      set({ wallet: w });
    } catch {
      /* not logged in / backend down — leave wallet as-is */
    }
  },

  openBuyTokens: () => set({ buyTokensOpen: true }),
  closeBuyTokens: () => set({ buyTokensOpen: false }),

  buyTokenPack: async (packId) => {
    const region = getRegion();
    const currency = billingFor(region).currency;
    const authUser = useAuthStore.getState().user;
    if (!authUser) {
      window.location.href = "/login";
      return;
    }
    set({ checkoutBusy: true });
    try {
      const orderRes: any = await api.tokens.createOrder(packId, currency, region);
      const ok = await loadRazorpayScript();
      if (!ok || !(window as any).Razorpay) throw new Error("Could not load secure checkout.");
      const rzp = new (window as any).Razorpay({
        key: orderRes.key_id,
        order_id: orderRes.order.id,
        amount: orderRes.order.amount,
        currency: orderRes.order.currency,
        name: "FundaKaMental — AI tokens",
        description: orderRes.pack?.label || "Token pack",
        theme: { color: "#16A34A" },
        prefill: { email: authUser.email || "" },
        handler: async (response: any) => {
          try {
            const verify: any = await api.tokens.verify({
              pack_id: packId,
              currency,
              region,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (!verify?.success) throw new Error("Verification failed");
            await get().fetchWallet();
            set({ buyTokensOpen: false });
          } catch {
            alert("Payment succeeded but we couldn't confirm it. Contact support with your payment ID.");
          } finally {
            set({ checkoutBusy: false });
          }
        },
        modal: { ondismiss: () => set({ checkoutBusy: false }) },
      });
      rzp.open();
    } catch (e: any) {
      set({ checkoutBusy: false });
      alert(e?.message || "Unable to start checkout.");
    }
  },

  startCheckout: async (planId) => {
    const region = getRegion();
    const currency = billingFor(region).currency;
    const authUser = useAuthStore.getState().user;

    // A purchase must be tied to an account so it survives across devices.
    if (!authUser) {
      set({ upgradeOpen: false });
      window.location.href = "/login";
      return;
    }

    set({ checkoutBusy: true });
    try {
      const orderRes: any = await api.razorpay.createOrder(planId, currency, region);
      const ok = await loadRazorpayScript();
      if (!ok || !(window as any).Razorpay) {
        throw new Error("Could not load the secure checkout. Check your connection.");
      }

      const rzp = new (window as any).Razorpay({
        key: orderRes.key_id,
        order_id: orderRes.order.id,
        amount: orderRes.order.amount,
        currency: orderRes.order.currency,
        name: "FundaKaMental Pro",
        description: orderRes.plan?.label || "Pro subscription",
        theme: { color: "#16A34A" },
        prefill: { email: authUser.email || "" },
        handler: async (response: any) => {
          try {
            const verify: any = await api.razorpay.verify({
              plan_id: planId,
              currency,
              region,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (!verify?.success) throw new Error("Verification failed");
            useAuthStore.getState().patchUser({ plan: "premium", reportsLimit: 999999 });
            set({ upgradeOpen: false, celebrating: true });
            setTimeout(() => set({ celebrating: false }), 2600);
          } catch {
            alert("Payment succeeded but we couldn't confirm it. Contact support with your payment ID.");
          } finally {
            set({ checkoutBusy: false });
          }
        },
        modal: { ondismiss: () => set({ checkoutBusy: false }) },
      });
      rzp.open();
    } catch (e: any) {
      set({ checkoutBusy: false });
      alert(e?.message || "Unable to start checkout. Please try again.");
    }
  },
}));
