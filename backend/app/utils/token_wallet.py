"""
AI token wallet — usage metering that keeps the product profitable.

Every AI generation (a report analysis, a Q&A message) costs real model
tokens. Each user has a wallet with:
  • a monthly allowance that resets each calendar month (by plan tier), and
  • a top-up balance from purchased packs that never expires.

Deductions come off the monthly allowance first, then top-ups. When both are
empty the caller blocks the action and prompts to upgrade (free) or buy a
pack (pro). All state lives in the Supabase `ai_wallets` table, written with
the service-role client (see fundamental_ai_wallets.sql).

Fail-open: if Supabase is unreachable we don't hard-block the user, we just
can't meter — production keeps Supabase up so metering is enforced there.
"""
from datetime import datetime, timezone
from typing import Dict

from app.db.database import get_supabase_admin_client

# Monthly allowance by plan tier (in model tokens).
#
# Unit economics (Claude 3.5 Sonnet primary, ~12K metered tokens/report ≈
# $0.078/report ≈ $6.5 per 1M metered tokens):
#   • The wallet is a HARD CAP — a user can never spend more than granted — so
#     as long as grant_cost < subscription_revenue, every subscriber is
#     profitable even at 100% utilisation.
#   • Free 60K   → ~$0.39/mo cost per free user (~5 reports). Acceptable CAC.
#   • Pro 500K   → ~$3.25/mo max cost vs ~$6 revenue (₹499) ⇒ ≥45% margin
#     floor, ~85% at typical usage (~40 reports/mo allowance).
MONTHLY_GRANT = {
    "free": 60_000,
    "premium": 500_000,
    "enterprise": 2_500_000,
}

# One-off top-up packs (Pro users who run out). Amounts in smallest unit.
# Each pack is priced for ~45-55% gross margin at the Sonnet cost above.
TOKEN_PACKS = {
    "pack_small":  {"tokens": 200_000,   "amounts": {"INR": 19900, "USD": 300,  "GBP": 200,  "EUR": 300},  "label": "200K tokens"},
    "pack_medium": {"tokens": 500_000,   "amounts": {"INR": 49900, "USD": 700,  "GBP": 500,  "EUR": 600},  "label": "500K tokens"},
    "pack_large":  {"tokens": 1_200_000, "amounts": {"INR": 99900, "USD": 1500, "GBP": 1100, "EUR": 1300}, "label": "1.2M tokens"},
}


def _period() -> str:
    now = datetime.now(timezone.utc)
    return f"{now.year}-{now.month:02d}"


def _grant_for(tier: str) -> int:
    return MONTHLY_GRANT.get(tier, MONTHLY_GRANT["free"])


def get_wallet(user_id: str, tier: str = "free") -> Dict:
    """
    Return the user's wallet, applying a monthly reset if the calendar month
    changed or the plan tier changed. Shape:
      { monthly_balance, topup_balance, balance, monthly_grant, period, tier,
        tokens_used_total }
    """
    admin = get_supabase_admin_client()
    period = _period()
    grant = _grant_for(tier)

    try:
        res = admin.table("ai_wallets").select("*").eq("user_id", user_id).maybe_single().execute()
        row = res.data if res and res.data else None
    except Exception as e:  # pragma: no cover
        print(f"[wallet] read failed: {e}")
        # Fail-open: pretend a full monthly allowance so we never wrongly block.
        return {
            "monthly_balance": grant, "topup_balance": 0, "balance": grant,
            "monthly_grant": grant, "period": period, "tier": tier,
            "tokens_used_total": 0, "_persisted": False,
        }

    if not row:
        wallet = {
            "user_id": user_id, "tier": tier, "period": period,
            "monthly_balance": grant, "topup_balance": 0,
            "monthly_grant": grant, "tokens_used_total": 0,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            admin.table("ai_wallets").insert(wallet).execute()
        except Exception as e:  # pragma: no cover
            print(f"[wallet] insert failed: {e}")
    else:
        wallet = row
        # Monthly reset (or tier change) tops the monthly allowance back up.
        if wallet.get("period") != period or wallet.get("tier") != tier:
            wallet["period"] = period
            wallet["tier"] = tier
            wallet["monthly_balance"] = grant
            wallet["monthly_grant"] = grant
            try:
                admin.table("ai_wallets").update({
                    "period": period, "tier": tier,
                    "monthly_balance": grant, "monthly_grant": grant,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("user_id", user_id).execute()
            except Exception as e:  # pragma: no cover
                print(f"[wallet] reset failed: {e}")

    monthly = int(wallet.get("monthly_balance", 0) or 0)
    topup = int(wallet.get("topup_balance", 0) or 0)
    return {
        "monthly_balance": monthly,
        "topup_balance": topup,
        "balance": monthly + topup,
        "monthly_grant": int(wallet.get("monthly_grant", grant) or grant),
        "period": wallet.get("period", period),
        "tier": wallet.get("tier", tier),
        "tokens_used_total": int(wallet.get("tokens_used_total", 0) or 0),
        "_persisted": True,
    }


def has_tokens(user_id: str, tier: str, needed: int = 1) -> bool:
    return get_wallet(user_id, tier).get("balance", 0) >= needed


def deduct(user_id: str, tokens: int, tier: str = "free") -> Dict:
    """Deduct from monthly allowance first, then top-ups. Returns updated wallet."""
    if tokens <= 0:
        return get_wallet(user_id, tier)
    w = get_wallet(user_id, tier)
    monthly = w["monthly_balance"]
    topup = w["topup_balance"]

    from_monthly = min(monthly, tokens)
    remaining = tokens - from_monthly
    from_topup = min(topup, remaining)
    new_monthly = monthly - from_monthly
    new_topup = topup - from_topup

    try:
        admin = get_supabase_admin_client()
        admin.table("ai_wallets").update({
            "monthly_balance": new_monthly,
            "topup_balance": new_topup,
            "tokens_used_total": w["tokens_used_total"] + tokens,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("user_id", user_id).execute()
    except Exception as e:  # pragma: no cover
        print(f"[wallet] deduct failed: {e}")

    w["monthly_balance"] = new_monthly
    w["topup_balance"] = new_topup
    w["balance"] = new_monthly + new_topup
    return w


def add_topup(user_id: str, tokens: int, tier: str = "free") -> Dict:
    """Credit purchased tokens to the persistent top-up balance."""
    w = get_wallet(user_id, tier)
    new_topup = w["topup_balance"] + int(tokens)
    try:
        admin = get_supabase_admin_client()
        admin.table("ai_wallets").update({
            "topup_balance": new_topup,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("user_id", user_id).execute()
    except Exception as e:  # pragma: no cover
        print(f"[wallet] topup failed: {e}")
    w["topup_balance"] = new_topup
    w["balance"] = w["monthly_balance"] + new_topup
    return w
