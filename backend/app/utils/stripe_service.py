"""
Stripe Integration Service
Handles all Stripe payment operations including subscriptions, customers, and webhooks
"""

import stripe
import os
from typing import Optional, Dict, Any, List
from datetime import datetime
from supabase import Client
from ..core.config import settings

# Initialize Stripe with API key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class StripeService:
    """Service for managing Stripe payments and subscriptions"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        
    # =========================================================================
    # CUSTOMER MANAGEMENT
    # =========================================================================
    
    async def get_or_create_customer(
        self, 
        user_id: str, 
        email: str,
        name: Optional[str] = None
    ) -> str:
        """
        Get existing Stripe customer ID or create a new customer
        
        Args:
            user_id: User's UUID from auth
            email: User's email address
            name: User's display name (optional)
            
        Returns:
            Stripe customer ID
        """
        # Check if user already has a Stripe customer ID
        result = self.supabase.table("subscriptions").select("stripe_customer_id").eq("user_id", user_id).execute()
        
        if result.data and result.data[0]["stripe_customer_id"]:
            return result.data[0]["stripe_customer_id"]
        
        # Create new Stripe customer
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={"user_id": user_id}
        )
        
        return customer.id
    
    # =========================================================================
    # CHECKOUT & SUBSCRIPTIONS
    # =========================================================================
    
    async def create_checkout_session(
        self,
        user_id: str,
        email: str,
        plan_name: str,
        billing_cycle: str = "monthly",
        success_url: str = None,
        cancel_url: str = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session for subscription purchase
        
        Args:
            user_id: User's UUID
            email: User's email
            plan_name: Plan name ('free' or 'premium')
            billing_cycle: 'monthly' or 'yearly'
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if payment canceled
            
        Returns:
            Dict with checkout session details including URL
        """
        # Get plan details from database
        plan_result = self.supabase.table("subscription_plans").select("*").eq("name", plan_name).execute()
        
        if not plan_result.data:
            raise ValueError(f"Plan '{plan_name}' not found")
        
        plan = plan_result.data[0]
        
        # Get or create Stripe customer
        customer_id = await self.get_or_create_customer(user_id, email)
        
        # Determine price ID based on billing cycle
        if billing_cycle == "yearly":
            price_id = plan.get("stripe_price_id_yearly")
        else:
            price_id = plan.get("stripe_price_id_monthly")
        
        if not price_id:
            raise ValueError(f"No Stripe price ID configured for {plan_name} ({billing_cycle})")
        
        # Default URLs
        if not success_url:
            success_url = f"{settings.FRONTEND_URL}/dashboard?payment=success"
        if not cancel_url:
            cancel_url = f"{settings.FRONTEND_URL}/pricing?payment=canceled"
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url + "&session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "plan_name": plan_name,
                "billing_cycle": billing_cycle
            },
            subscription_data={
                "metadata": {
                    "user_id": user_id,
                    "plan_name": plan_name
                }
            },
            allow_promotion_codes=True,
            billing_address_collection="auto"
        )
        
        # Store checkout session reference
        self.supabase.table("subscriptions").upsert({
            "user_id": user_id,
            "plan_id": plan["id"],
            "stripe_customer_id": customer_id,
            "stripe_checkout_session_id": session.id,
            "status": "incomplete",
            "billing_cycle": billing_cycle
        }, on_conflict="user_id").execute()
        
        return {
            "session_id": session.id,
            "url": session.url,
            "customer_id": customer_id
        }
    
    async def create_portal_session(
        self,
        user_id: str,
        return_url: str = None
    ) -> Dict[str, str]:
        """
        Create a Stripe Customer Portal session for managing subscription
        Users can cancel, update payment method, view invoices, etc.
        
        Args:
            user_id: User's UUID
            return_url: URL to return to after portal
            
        Returns:
            Dict with portal session URL
        """
        # Get user's Stripe customer ID
        result = self.supabase.table("subscriptions").select("stripe_customer_id").eq("user_id", user_id).execute()
        
        if not result.data or not result.data[0]["stripe_customer_id"]:
            raise ValueError("User has no Stripe customer ID")
        
        customer_id = result.data[0]["stripe_customer_id"]
        
        # Default return URL
        if not return_url:
            return_url = f"{settings.FRONTEND_URL}/settings"
        
        # Create portal session
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url
        )
        
        return {
            "url": session.url
        }
    
    # =========================================================================
    # SUBSCRIPTION QUERIES
    # =========================================================================
    
    async def get_subscription_status(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user's current subscription status with plan details
        
        Args:
            user_id: User's UUID
            
        Returns:
            Dict with subscription details or None if no subscription
        """
        # Use the database function to get subscription with plan info
        result = self.supabase.rpc("get_user_subscription", {"p_user_id": user_id}).execute()
        
        if result.data:
            return result.data[0]
        
        # Return free plan as default
        free_plan = self.supabase.table("subscription_plans").select("*").eq("name", "free").execute()
        
        if free_plan.data:
            plan = free_plan.data[0]
            return {
                "subscription_id": None,
                "plan_name": "free",
                "plan_type": "free",
                "status": "active",
                "current_period_end": None,
                "cancel_at_period_end": False,
                "features": plan["features"],
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
            }
        
        return None
    
    async def check_feature_access(self, user_id: str, feature_name: str) -> bool:
        """
        Check if user has access to a specific feature
        
        Args:
            user_id: User's UUID
            feature_name: Feature to check (e.g., 'technical_indicators')
            
        Returns:
            Boolean indicating access
        """
        result = self.supabase.rpc("has_feature_access", {
            "p_user_id": user_id,
            "p_feature_name": feature_name
        }).execute()
        
        return result.data if result.data else False
    
    async def check_usage_limit(self, user_id: str, limit_type: str) -> Dict[str, Any]:
        """
        Check if user has exceeded their usage limit
        
        Args:
            user_id: User's UUID
            limit_type: Type of limit ('screening_runs', 'analysis_runs', 'chat_messages')
            
        Returns:
            Dict with allowed (bool), limit (int), used (int), remaining (int)
        """
        result = self.supabase.rpc("check_usage_limit", {
            "p_user_id": user_id,
            "p_limit_type": limit_type
        }).execute()
        
        return result.data if result.data else {
            "allowed": False,
            "limit": 0,
            "used": 0,
            "remaining": 0
        }
    
    async def increment_usage(self, user_id: str, usage_type: str) -> None:
        """
        Increment usage counter for rate limiting
        
        Args:
            user_id: User's UUID
            usage_type: Type of usage to increment
        """
        self.supabase.rpc("increment_usage", {
            "p_user_id": user_id,
            "p_usage_type": usage_type
        }).execute()
    
    # =========================================================================
    # WEBHOOK HANDLING
    # =========================================================================
    
    def construct_webhook_event(
        self,
        payload: bytes,
        signature: str
    ) -> stripe.Event:
        """
        Verify and construct a Stripe webhook event
        
        Args:
            payload: Raw request body
            signature: Stripe signature header
            
        Returns:
            Verified Stripe Event object
            
        Raises:
            ValueError: If signature verification fails
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            return event
        except ValueError as e:
            raise ValueError(f"Invalid payload: {str(e)}")
        except stripe.error.SignatureVerificationError as e:
            raise ValueError(f"Invalid signature: {str(e)}")
    
    async def handle_webhook_event(self, event: stripe.Event) -> Dict[str, Any]:
        """
        Process a Stripe webhook event
        
        Args:
            event: Verified Stripe Event
            
        Returns:
            Dict with processing result
        """
        # Log webhook event
        self.supabase.table("stripe_webhook_events").insert({
            "stripe_event_id": event.id,
            "event_type": event.type,
            "payload": event.to_dict(),
            "processed": False
        }).execute()
        
        try:
            # Handle different event types
            if event.type == "checkout.session.completed":
                await self._handle_checkout_completed(event.data.object)
            
            elif event.type == "customer.subscription.created":
                await self._handle_subscription_created(event.data.object)
            
            elif event.type == "customer.subscription.updated":
                await self._handle_subscription_updated(event.data.object)
            
            elif event.type == "customer.subscription.deleted":
                await self._handle_subscription_deleted(event.data.object)
            
            elif event.type == "invoice.paid":
                await self._handle_invoice_paid(event.data.object)
            
            elif event.type == "invoice.payment_failed":
                await self._handle_invoice_payment_failed(event.data.object)
            
            # Mark as processed
            self.supabase.table("stripe_webhook_events").update({
                "processed": True,
                "processed_at": datetime.utcnow().isoformat()
            }).eq("stripe_event_id", event.id).execute()
            
            return {"status": "success", "event_type": event.type}
            
        except Exception as e:
            # Log error
            self.supabase.table("stripe_webhook_events").update({
                "processing_error": str(e)
            }).eq("stripe_event_id", event.id).execute()
            
            raise
    
    # =========================================================================
    # WEBHOOK EVENT HANDLERS (PRIVATE)
    # =========================================================================
    
    async def _handle_checkout_completed(self, session: stripe.checkout.Session):
        """Handle successful checkout session completion"""
        user_id = session.metadata.get("user_id")
        
        if not user_id:
            return
        
        # Update subscription record
        self.supabase.table("subscriptions").update({
            "stripe_subscription_id": session.subscription,
            "status": "active"
        }).eq("user_id", user_id).execute()
    
    async def _handle_subscription_created(self, subscription: stripe.Subscription):
        """Handle new subscription creation"""
        user_id = subscription.metadata.get("user_id")
        plan_name = subscription.metadata.get("plan_name", "premium")
        
        if not user_id:
            return
        
        # Get plan ID
        plan_result = self.supabase.table("subscription_plans").select("id").eq("name", plan_name).execute()
        
        if not plan_result.data:
            return
        
        plan_id = plan_result.data[0]["id"]
        
        # Create or update subscription record
        self.supabase.table("subscriptions").upsert({
            "user_id": user_id,
            "plan_id": plan_id,
            "stripe_customer_id": subscription.customer,
            "stripe_subscription_id": subscription.id,
            "status": subscription.status,
            "current_period_start": datetime.fromtimestamp(subscription.current_period_start).isoformat(),
            "current_period_end": datetime.fromtimestamp(subscription.current_period_end).isoformat(),
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "billing_cycle": "yearly" if subscription.items.data[0].price.recurring.interval == "year" else "monthly",
            "amount": subscription.items.data[0].price.unit_amount / 100,
            "currency": subscription.currency
        }, on_conflict="user_id").execute()
    
    async def _handle_subscription_updated(self, subscription: stripe.Subscription):
        """Handle subscription updates (plan changes, cancellations, etc.)"""
        # Update subscription record
        update_data = {
            "status": subscription.status,
            "current_period_start": datetime.fromtimestamp(subscription.current_period_start).isoformat(),
            "current_period_end": datetime.fromtimestamp(subscription.current_period_end).isoformat(),
            "cancel_at_period_end": subscription.cancel_at_period_end
        }
        
        if subscription.canceled_at:
            update_data["canceled_at"] = datetime.fromtimestamp(subscription.canceled_at).isoformat()
        
        self.supabase.table("subscriptions").update(update_data).eq(
            "stripe_subscription_id", subscription.id
        ).execute()
    
    async def _handle_subscription_deleted(self, subscription: stripe.Subscription):
        """Handle subscription deletion/cancellation"""
        # Update subscription to expired
        self.supabase.table("subscriptions").update({
            "status": "expired",
            "canceled_at": datetime.utcnow().isoformat()
        }).eq("stripe_subscription_id", subscription.id).execute()
    
    async def _handle_invoice_paid(self, invoice: stripe.Invoice):
        """Handle successful payment"""
        subscription_id = invoice.subscription
        
        if not subscription_id:
            return
        
        # Get subscription to find user_id
        sub_result = self.supabase.table("subscriptions").select("user_id, id").eq(
            "stripe_subscription_id", subscription_id
        ).execute()
        
        if not sub_result.data:
            return
        
        user_id = sub_result.data[0]["user_id"]
        sub_db_id = sub_result.data[0]["id"]
        
        # Record payment
        self.supabase.table("payment_history").insert({
            "user_id": user_id,
            "subscription_id": sub_db_id,
            "stripe_payment_intent_id": invoice.payment_intent,
            "stripe_charge_id": invoice.charge,
            "stripe_invoice_id": invoice.id,
            "amount": invoice.amount_paid / 100,
            "currency": invoice.currency,
            "status": "succeeded",
            "payment_method": "card",
            "description": f"Subscription payment - {invoice.lines.data[0].description if invoice.lines.data else 'Premium Plan'}"
        }).execute()
    
    async def _handle_invoice_payment_failed(self, invoice: stripe.Invoice):
        """Handle failed payment"""
        subscription_id = invoice.subscription
        
        if not subscription_id:
            return
        
        # Get subscription to find user_id
        sub_result = self.supabase.table("subscriptions").select("user_id, id").eq(
            "stripe_subscription_id", subscription_id
        ).execute()
        
        if not sub_result.data:
            return
        
        user_id = sub_result.data[0]["user_id"]
        sub_db_id = sub_result.data[0]["id"]
        
        # Update subscription status to past_due
        self.supabase.table("subscriptions").update({
            "status": "past_due"
        }).eq("stripe_subscription_id", subscription_id).execute()
        
        # Record failed payment
        self.supabase.table("payment_history").insert({
            "user_id": user_id,
            "subscription_id": sub_db_id,
            "stripe_payment_intent_id": invoice.payment_intent,
            "stripe_invoice_id": invoice.id,
            "amount": invoice.amount_due / 100,
            "currency": invoice.currency,
            "status": "failed",
            "failure_message": "Payment failed",
            "description": f"Subscription payment failed - {invoice.lines.data[0].description if invoice.lines.data else 'Premium Plan'}"
        }).execute()
    
    # =========================================================================
    # ADMIN FUNCTIONS
    # =========================================================================
    
    async def cancel_subscription(self, user_id: str, immediately: bool = False) -> Dict[str, Any]:
        """
        Cancel a user's subscription
        
        Args:
            user_id: User's UUID
            immediately: If True, cancel immediately. If False, cancel at period end.
            
        Returns:
            Dict with cancellation details
        """
        # Get user's subscription
        result = self.supabase.table("subscriptions").select(
            "stripe_subscription_id"
        ).eq("user_id", user_id).execute()
        
        if not result.data or not result.data[0]["stripe_subscription_id"]:
            raise ValueError("No active subscription found")
        
        subscription_id = result.data[0]["stripe_subscription_id"]
        
        if immediately:
            # Cancel immediately
            subscription = stripe.Subscription.delete(subscription_id)
        else:
            # Cancel at period end
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
        
        return {
            "subscription_id": subscription.id,
            "status": subscription.status,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "current_period_end": subscription.current_period_end
        }
    
    async def get_payment_history(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get user's payment history
        
        Args:
            user_id: User's UUID
            limit: Maximum number of records to return
            
        Returns:
            List of payment records
        """
        result = self.supabase.table("payment_history").select(
            "*"
        ).eq("user_id", user_id).order(
            "created_at", desc=True
        ).limit(limit).execute()
        
        return result.data if result.data else []


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_stripe_service(supabase_client: Client) -> StripeService:
    """Factory function to create StripeService instance"""
    return StripeService(supabase_client)
