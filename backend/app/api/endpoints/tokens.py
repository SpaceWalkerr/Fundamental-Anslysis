"""
AI token wallet API — balance, top-up packs (Razorpay), and pack catalogue.

Buying Pro raises the monthly allowance; when a Pro user still runs out they
can buy one-off top-up packs here. All grants happen server-side after a
verified payment.
"""
import hashlib
import hmac
import time
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_user
from app.db.database import get_supabase_admin_client
from app.utils.token_wallet import get_wallet, add_topup, TOKEN_PACKS, MONTHLY_GRANT

router = APIRouter()
SUPPORTED_CURRENCIES = {"INR", "USD", "GBP", "EUR"}


class PackOrderRequest(BaseModel):
    pack_id: str
    currency: str = "INR"
    region: str = None


class PackVerifyRequest(BaseModel):
    pack_id: str
    currency: str = "INR"
    region: str = None
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.get("/tokens/wallet")
async def wallet(current_user: dict = Depends(get_current_user)):
    tier = current_user.get("plan", "free")
    w = get_wallet(current_user["id"], tier)
    return {
        "balance": w["balance"],
        "monthly_balance": w["monthly_balance"],
        "monthly_grant": w["monthly_grant"],
        "topup_balance": w["topup_balance"],
        "tier": tier,
        "grants": MONTHLY_GRANT,
    }


@router.get("/tokens/packs")
async def packs():
    return {"packs": {k: v for k, v in TOKEN_PACKS.items()}}


@router.post("/tokens/order")
async def create_pack_order(body: PackOrderRequest, current_user: dict = Depends(get_current_user)):
    pack = TOKEN_PACKS.get(body.pack_id)
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid pack")
    currency = (body.currency or "INR").upper()
    if currency not in SUPPORTED_CURRENCIES:
        currency = "INR"
    amount = pack["amounts"].get(currency)
    if amount is None:
        raise HTTPException(status_code=400, detail="Currency not available")
    if not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET):
        raise HTTPException(status_code=500, detail="Payment service not configured")

    auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    payload = {
        "amount": amount,
        "currency": currency,
        "receipt": f"fk_tok_{body.pack_id}_{int(time.time())}",
        "notes": {
            "product": "fundakamental_tokens",
            "pack_id": body.pack_id,
            "tokens": str(pack["tokens"]),
            "user_id": str(current_user.get("id", "")),
        },
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post("https://api.razorpay.com/v1/orders", json=payload, auth=auth)
        data = resp.json()
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code,
                                detail=data.get("error", {}).get("description", "Unable to create order"))
        return {
            "success": True,
            "key_id": settings.RAZORPAY_KEY_ID,
            "order": data,
            "pack": {"id": body.pack_id, "tokens": pack["tokens"], "label": pack["label"],
                     "currency": currency, "amount": amount},
        }
    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Payment error: {e}")


@router.post("/tokens/verify")
async def verify_pack(body: PackVerifyRequest, current_user: dict = Depends(get_current_user)):
    pack = TOKEN_PACKS.get(body.pack_id)
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid pack")
    if not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Payment service not configured")

    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    user_id = current_user["id"]
    tier = current_user.get("plan", "free")
    w = add_topup(user_id, pack["tokens"], tier)

    # Audit the purchase (best-effort).
    try:
        currency = (body.currency or "INR").upper()
        get_supabase_admin_client().table("token_pack_purchases").insert({
            "user_id": user_id,
            "pack_id": body.pack_id,
            "tokens": pack["tokens"],
            "currency": currency,
            "region": (body.region or "").upper() or None,
            "amount": pack["amounts"].get(currency, 0) / 100.0,
            "payment_id": body.razorpay_payment_id,
            "order_id": body.razorpay_order_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:  # pragma: no cover
        print(f"[tokens] purchase audit failed: {e}")

    return {"success": True, "tokens_added": pack["tokens"], "balance": w["balance"]}
