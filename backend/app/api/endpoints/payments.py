"""
Payment and Subscription API Endpoints
Handles Stripe payment operations, subscription management, and webhooks
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from typing import Optional, List
from pydantic import BaseModel, EmailStr
import stripe

from app.core.security import get_current_user
from app.db.database import get_db
from app.utils.stripe_service import StripeService, get_stripe_service
from supabase import Client

router = APIRouter()

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class CheckoutSessionRequest(BaseModel):
    plan_name: str  # 'free' or 'premium'
    billing_cycle: str = "monthly"  # 'monthly' or 'yearly'
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

class CheckoutSessionResponse(BaseModel):
    session_id: str
    url: str
    customer_id: str

class PortalSessionResponse(BaseModel):
    url: str

class SubscriptionStatusResponse(BaseModel):
    subscription_id: Optional[str]
    plan_name: str
    plan_type: str
    status: str
    current_period_end: Optional[str]
    cancel_at_period_end: bool
    features: List[str]
    limits: dict

class FeatureAccessRequest(BaseModel):
    feature_name: str

class FeatureAccessResponse(BaseModel):
    has_access: bool
    feature_name: str

class UsageLimitResponse(BaseModel):
    allowed: bool
    limit: int
    used: int
    remaining: int

class CancelSubscriptionRequest(BaseModel):
    immediately: bool = False

class SubscriptionPlanResponse(BaseModel):
    id: str
    name: str
    display_name: str
    description: str
    price_monthly: float
    price_yearly: Optional[float]
    features: List[str]
    limits: dict
    plan_type: str

class PaymentHistoryResponse(BaseModel):
    id: str
    amount: float
    currency: str
    status: str
    payment_method: Optional[str]
    description: Optional[str]
    created_at: str

# ============================================================================
# SUBSCRIPTION PLANS
# ============================================================================

@router.get("/subscription-plans", response_model=List[SubscriptionPlanResponse])
async def get_subscription_plans(
    supabase: Client = Depends(get_db)
):
    """
    Get all available subscription plans
    Public endpoint - no authentication required
    """
    result = supabase.table("subscription_plans").select("*").eq("is_active", True).order("price_monthly").execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="No subscription plans found")
    
    plans = []
    for plan in result.data:
        plans.append({
            "id": plan["id"],
            "name": plan["name"],
            "display_name": plan["display_name"],
            "description": plan["description"],
            "price_monthly": float(plan["price_monthly"]),
            "price_yearly": float(plan["price_yearly"]) if plan["price_yearly"] else None,
            "features": plan["features"],
            "plan_type": plan["plan_type"],
            "limits": {
                "max_watchlist_stocks": plan["max_watchlist_stocks"],
                "max_alerts": plan["max_alerts"],
                "max_screening_runs_per_day": plan["max_screening_runs_per_day"],
                "max_analysis_runs_per_day": plan["max_analysis_runs_per_day"],
                "max_chat_messages_per_day": plan["max_chat_messages_per_day"],
                "enable_technical_indicators": plan["enable_technical_indicators"],
                "enable_realtime_data": plan["enable_realtime_data"],
                "enable_advanced_screening": plan["enable_advanced_screening"],
                "enable_pdf_export": plan["enable_pdf_export"],
                "enable_email_alerts": plan["enable_email_alerts"],
                "enable_priority_support": plan["enable_priority_support"]
            }
        })
    
    return plans

# ============================================================================
# SUBSCRIPTION STATUS
# ============================================================================

@router.get("/subscription/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get current user's subscription status and plan details
    Protected endpoint - requires authentication
    """
    stripe_service = get_stripe_service(supabase)
    
    try:
        subscription = await stripe_service.get_subscription_status(current_user["id"])
        
        if not subscription:
            raise HTTPException(status_code=404, detail="No subscription found")
        
        return subscription
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching subscription: {str(e)}")

# ============================================================================
# CHECKOUT & PAYMENT
# ============================================================================

@router.post("/subscription/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Create a Stripe Checkout session for subscribing to a plan
    Protected endpoint - requires authentication
    
    Returns a checkout URL that the frontend should redirect to
    """
    stripe_service = get_stripe_service(supabase)
    
    try:
        # Validate plan
        if request.plan_name not in ["free", "premium"]:
            raise HTTPException(status_code=400, detail="Invalid plan name. Must be 'free' or 'premium'")
        
        # Free plan doesn't need checkout
        if request.plan_name == "free":
            raise HTTPException(status_code=400, detail="Free plan doesn't require checkout")
        
        # Validate billing cycle
        if request.billing_cycle not in ["monthly", "yearly"]:
            raise HTTPException(status_code=400, detail="Invalid billing cycle. Must be 'monthly' or 'yearly'")
        
        # Create checkout session
        session = await stripe_service.create_checkout_session(
            user_id=current_user["id"],
            email=current_user["email"],
            plan_name=request.plan_name,
            billing_cycle=request.billing_cycle,
            success_url=request.success_url,
            cancel_url=request.cancel_url
        )
        
        return session
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating checkout session: {str(e)}")

@router.post("/subscription/portal", response_model=PortalSessionResponse)
async def create_portal_session(
    return_url: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Create a Stripe Customer Portal session for managing subscription
    Users can cancel, update payment method, view invoices, etc.
    Protected endpoint - requires authentication
    
    Returns a portal URL that the frontend should redirect to
    """
    stripe_service = get_stripe_service(supabase)
    
    try:
        portal = await stripe_service.create_portal_session(
            user_id=current_user["id"],
            return_url=return_url
        )
        
        return portal
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating portal session: {str(e)}")

# ============================================================================
# SUBSCRIPTION MANAGEMENT
# ============================================================================

@router.post("/subscription/cancel")
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Cancel user's subscription
    Protected endpoint - requires authentication
    
    By default, cancels at period end (user retains access until then)
    Set immediately=true to cancel immediately
    """
    stripe_service = get_stripe_service(supabase)
    
    try:
        result = await stripe_service.cancel_subscription(
            user_id=current_user["id"],
            immediately=request.immediately
        )
        
        return {
            "success": True,
            "message": "Subscription canceled" + (" immediately" if request.immediately else " at period end"),
            "details": result
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error canceling subscription: {str(e)}")

# ============================================================================
# FEATURE ACCESS & LIMITS
# ============================================================================

@router.post("/subscription/check-feature", response_model=FeatureAccessResponse)
async def check_feature_access(
    request: FeatureAccessRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Check if user has access to a specific premium feature
    Protected endpoint - requires authentication
    
    Feature names:
    - technical_indicators
    - realtime_data
    - advanced_screening
    - pdf_export
    - email_alerts
    - priority_support
    """
    stripe_service = get_stripe_service(supabase)
    
    try:
        has_access = await stripe_service.check_feature_access(
            user_id=current_user["id"],
            feature_name=request.feature_name
        )
        
        return {
            "has_access": has_access,
            "feature_name": request.feature_name
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking feature access: {str(e)}")

@router.get("/subscription/usage/{limit_type}", response_model=UsageLimitResponse)
async def check_usage_limit(
    limit_type: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Check user's usage against their plan limits
    Protected endpoint - requires authentication
    
    Limit types:
    - screening_runs
    - analysis_runs
    - chat_messages
    - alerts
    
    Returns:
    - allowed: Whether user can perform the action
    - limit: Maximum allowed per day (-1 = unlimited)
    - used: How many used today
    - remaining: How many remaining (-1 = unlimited)
    """
    stripe_service = get_stripe_service(supabase)
    
    try:
        usage = await stripe_service.check_usage_limit(
            user_id=current_user["id"],
            limit_type=limit_type
        )
        
        return usage
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking usage limit: {str(e)}")

@router.post("/subscription/increment-usage/{usage_type}")
async def increment_usage(
    usage_type: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Increment usage counter (internal endpoint, typically called by other services)
    Protected endpoint - requires authentication
    
    Usage types:
    - screening_runs
    - analysis_runs
    - chat_messages
    - alerts_created
    - pdf_exports
    """
    stripe_service = get_stripe_service(supabase)
    
    try:
        await stripe_service.increment_usage(
            user_id=current_user["id"],
            usage_type=usage_type
        )
        
        return {"success": True, "message": f"Usage incremented for {usage_type}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error incrementing usage: {str(e)}")

# ============================================================================
# PAYMENT HISTORY
# ============================================================================

@router.get("/subscription/payment-history", response_model=List[PaymentHistoryResponse])
async def get_payment_history(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get user's payment history
    Protected endpoint - requires authentication
    """
    stripe_service = get_stripe_service(supabase)
    
    try:
        history = await stripe_service.get_payment_history(
            user_id=current_user["id"],
            limit=limit
        )
        
        return history
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching payment history: {str(e)}")

# ============================================================================
# STRIPE WEBHOOKS
# ============================================================================

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    supabase: Client = Depends(get_db)
):
    """
    Handle Stripe webhook events
    Public endpoint (verified by Stripe signature)
    
    This endpoint receives events from Stripe when:
    - Checkout session completes
    - Subscription is created/updated/deleted
    - Payment succeeds/fails
    - Customer is updated
    - etc.
    
    Stripe will send webhooks to: https://yourdomain.com/api/webhooks/stripe
    """
    stripe_service = get_stripe_service(supabase)
    
    # Get raw body
    payload = await request.body()
    
    try:
        # Verify webhook signature
        event = stripe_service.construct_webhook_event(payload, stripe_signature)
        
        # Handle the event
        result = await stripe_service.handle_webhook_event(event)
        
        return JSONResponse(content=result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log error but return 200 to acknowledge receipt
        print(f"Webhook error: {str(e)}")
        return JSONResponse(
            status_code=200,
            content={"status": "error", "message": str(e)}
        )

# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/subscription/health")
async def payment_health_check():
    """
    Health check endpoint for payment system
    Public endpoint
    """
    import os
    
    stripe_configured = bool(os.getenv("STRIPE_SECRET_KEY"))
    webhook_configured = bool(os.getenv("STRIPE_WEBHOOK_SECRET"))
    
    return {
        "status": "healthy",
        "stripe_configured": stripe_configured,
        "webhook_configured": webhook_configured,
        "stripe_version": stripe.api_version
    }
