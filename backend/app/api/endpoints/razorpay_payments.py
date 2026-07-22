"""
Razorpay Pro subscription payments.

Flow:
  1. POST /api/razorpay/order   -> create a Razorpay order for a plan+currency
  2. Razorpay Checkout (client) -> user pays
  3. POST /api/razorpay/verify  -> verify signature, then (server-side, using
     the Supabase service-role key) upgrade profiles.plan = 'premium' and record
     the payment in pro_payments. The client is NEVER trusted to grant Pro.
  4. GET  /api/razorpay/plan    -> current authoritative plan for the user

Amounts are stored in the smallest currency unit (paise / cents).
"""
import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_user
from app.db.database import get_supabase_admin_client

router = APIRouter()

# Plan catalogue. Amounts in smallest unit: INR paise, USD cents.
PRO_PLANS = {
    "pro_monthly": {
        "label": "FundaKaMental Pro — Monthly",
        "billing": "monthly",
        "duration_days": 31,
        "amounts": {"INR": 49900, "USD": 900, "GBP": 700, "EUR": 800},
    },
    "pro_yearly": {
        "label": "FundaKaMental Pro — Yearly",
        "billing": "yearly",
        "duration_days": 366,
        "amounts": {"INR": 399900, "USD": 5900, "GBP": 4900, "EUR": 5500},
    },
}
SUPPORTED_CURRENCIES = {"INR", "USD", "GBP", "EUR"}


class OrderRequest(BaseModel):
    plan_id: str
    currency: str = "INR"
    region: str = None


class VerifyRequest(BaseModel):
    plan_id: str
    currency: str = "INR"
    region: str = None
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


def _keys_configured() -> bool:
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


@router.post("/razorpay/order")
async def create_order(body: OrderRequest, current_user: dict = Depends(get_current_user)):
    plan = PRO_PLANS.get(body.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")
    currency = (body.currency or "INR").upper()
    if currency not in SUPPORTED_CURRENCIES:
        currency = "INR"
    amount = plan["amounts"].get(currency)
    if amount is None:
        raise HTTPException(status_code=400, detail="Currency not available for this plan")
    if not _keys_configured():
        raise HTTPException(status_code=500, detail="Payment service not configured")

    auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    payload = {
        "amount": amount,
        "currency": currency,
        "receipt": f"fk_{body.plan_id}_{int(time.time())}",
        "notes": {
            "product": "fundakamental_pro",
            "plan_id": body.plan_id,
            "user_id": str(current_user.get("id", "")),
            "user_email": str(current_user.get("email", ""))[:254],
        },
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post("https://api.razorpay.com/v1/orders", json=payload, auth=auth)
        data = resp.json()
        if resp.status_code >= 400:
            detail = data.get("error", {}).get("description", "Unable to create order")
            raise HTTPException(status_code=resp.status_code, detail=detail)
        return {
            "success": True,
            "key_id": settings.RAZORPAY_KEY_ID,
            "order": data,
            "plan": {"id": body.plan_id, "label": plan["label"], "currency": currency, "amount": amount},
        }
    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Payment error: {e}")


@router.post("/razorpay/verify")
async def verify_payment(body: VerifyRequest, current_user: dict = Depends(get_current_user)):
    plan = PRO_PLANS.get(body.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Payment service not configured")

    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    now = datetime.now(timezone.utc)
    valid_until = now + timedelta(days=plan["duration_days"])
    currency = (body.currency or "INR").upper()
    amount = plan["amounts"].get(currency, 0)

    # Server-side, service-role write. This is the ONLY place Pro is granted.
    cloud_saved = False
    try:
        admin = get_supabase_admin_client()
        admin.table("profiles").update({
            "plan": "premium",
            "reports_limit": 999999,
            "plan_valid_until": valid_until.isoformat(),
        }).eq("id", user_id).execute()
        admin.table("pro_payments").insert({
            "user_id": user_id,
            "plan_id": body.plan_id,
            "billing": plan["billing"],
            "currency": currency,
            "region": (body.region or "").upper() or None,
            "amount": amount / 100.0,
            "payment_id": body.razorpay_payment_id,
            "order_id": body.razorpay_order_id,
            "activated_at": now.isoformat(),
            "valid_until": valid_until.isoformat(),
        }).execute()
        cloud_saved = True
    except Exception as e:  # pragma: no cover
        print(f"[Razorpay Verify] Supabase write failed: {e}")

    return {
        "success": True,
        "plan": "premium",
        "valid_until": valid_until.isoformat(),
        "cloud_saved": cloud_saved,
    }


@router.get("/razorpay/plan")
async def get_plan(current_user: dict = Depends(get_current_user)):
    """Authoritative plan for the logged-in user, with expiry auto-downgrade."""
    user_id = current_user.get("id")
    plan = current_user.get("plan", "free")
    valid_until = None
    try:
        admin = get_supabase_admin_client()
        res = admin.table("profiles").select("plan, plan_valid_until").eq("id", user_id).single().execute()
        row = res.data or {}
        plan = row.get("plan", plan)
        valid_until = row.get("plan_valid_until")
        # Expire a lapsed paid plan back to free.
        if plan in ("premium", "enterprise") and valid_until:
            exp = datetime.fromisoformat(str(valid_until).replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                admin.table("profiles").update({"plan": "free", "reports_limit": 5}).eq("id", user_id).execute()
                plan = "free"
                valid_until = None
    except Exception as e:  # pragma: no cover
        print(f"[Razorpay Plan] read failed: {e}")

    return {"plan": plan, "is_pro": plan in ("premium", "enterprise"), "valid_until": valid_until}
