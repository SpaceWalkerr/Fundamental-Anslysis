"""
Premium Feature Gates and Usage Limiting
Decorators and dependencies to protect premium features and enforce usage limits
"""

from fastapi import Depends, HTTPException, status
from functools import wraps
from typing import Callable, Optional
from supabase import Client

from ..core.security import get_current_user
from ..db.database import get_db
from ..utils.stripe_service import StripeService, get_stripe_service


# ============================================================================
# FEATURE ACCESS DEPENDENCIES
# ============================================================================

async def require_premium(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
) -> dict:
    """
    Dependency that requires user to have an active premium subscription
    Raises 403 if user is on free plan
    
    Usage:
        @router.get("/premium-endpoint")
        async def my_endpoint(user: dict = Depends(require_premium)):
            # User is guaranteed to have premium access
            pass
    """
    stripe_service = get_stripe_service(supabase)
    subscription = await stripe_service.get_subscription_status(current_user["id"])
    
    if not subscription or subscription["plan_type"] != "premium":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires a Premium subscription. Upgrade your plan to access this feature."
        )
    
    return current_user


def require_feature(feature_name: str):
    """
    Factory function to create a dependency that checks for a specific feature
    
    Usage:
        @router.get("/technical-endpoint")
        async def my_endpoint(user: dict = Depends(require_feature("technical_indicators"))):
            # User has access to technical indicators
            pass
    """
    async def feature_checker(
        current_user: dict = Depends(get_current_user),
        supabase: Client = Depends(get_db)
    ) -> dict:
        stripe_service = get_stripe_service(supabase)
        has_access = await stripe_service.check_feature_access(
            user_id=current_user["id"],
            feature_name=feature_name
        )
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature ({feature_name}) requires a Premium subscription. Upgrade your plan to access it."
            )
        
        return current_user
    
    return feature_checker


# Individual feature dependencies (ready to use)
require_technical_indicators = require_feature("technical_indicators")
require_realtime_data = require_feature("realtime_data")
require_advanced_screening = require_feature("advanced_screening")
require_pdf_export = require_feature("pdf_export")
require_email_alerts = require_feature("email_alerts")


# ============================================================================
# USAGE LIMIT DEPENDENCIES
# ============================================================================

def check_and_increment_usage(
    limit_type: str,
    increment: bool = True
):
    """
    Factory function to create usage-checking dependency
    
    Args:
        limit_type: Type of usage to check ('screening_runs', 'analysis_runs', 'chat_messages')
        increment: Whether to auto-increment usage counter
    
    Usage:
        @router.post("/screen-stocks")
        async def screen_stocks(
            user: dict = Depends(check_and_increment_usage("screening_runs"))
        ):
            # Usage has been checked and incremented
            pass
    """
    async def usage_checker(
        current_user: dict = Depends(get_current_user),
        supabase: Client = Depends(get_db)
    ) -> dict:
        stripe_service = get_stripe_service(supabase)
        
        # Check usage limit
        usage = await stripe_service.check_usage_limit(
            user_id=current_user["id"],
            limit_type=limit_type
        )
        
        if not usage["allowed"]:
            # Build helpful error message
            if usage["limit"] == -1:
                error_msg = f"Usage limit check failed for {limit_type}"
            else:
                error_msg = (
                    f"Daily limit reached for {limit_type}. "
                    f"You've used {usage['used']} out of {usage['limit']} allowed today. "
                    f"Upgrade to Premium for unlimited access."
                )
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_msg
            )
        
        # Increment usage if requested
        if increment:
            await stripe_service.increment_usage(
                user_id=current_user["id"],
                usage_type=limit_type
            )
        
        # Add usage info to user object for convenience
        current_user["usage"] = usage
        
        return current_user
    
    return usage_checker


# Pre-configured usage checkers (ready to use)
check_screening_limit = check_and_increment_usage("screening_runs", increment=True)
check_analysis_limit = check_and_increment_usage("analysis_runs", increment=True)
check_chat_limit = check_and_increment_usage("chat_messages", increment=True)
check_alert_limit = check_and_increment_usage("alerts", increment=False)  # Checked separately
check_pdf_limit = check_and_increment_usage("pdf_exports", increment=True)


# ============================================================================
# COMBINED CHECKS
# ============================================================================

def require_feature_and_usage(
    feature_name: str,
    limit_type: str
):
    """
    Factory function for combined feature access AND usage limit check
    
    Usage:
        @router.post("/advanced-screen")
        async def advanced_screen(
            user: dict = Depends(require_feature_and_usage("advanced_screening", "screening_runs"))
        ):
            # User has feature access AND hasn't exceeded usage
            pass
    """
    async def combined_checker(
        current_user: dict = Depends(get_current_user),
        supabase: Client = Depends(get_db)
    ) -> dict:
        stripe_service = get_stripe_service(supabase)
        
        # Check feature access
        has_access = await stripe_service.check_feature_access(
            user_id=current_user["id"],
            feature_name=feature_name
        )
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires Premium subscription."
            )
        
        # Check usage limit
        usage = await stripe_service.check_usage_limit(
            user_id=current_user["id"],
            limit_type=limit_type
        )
        
        if not usage["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily limit reached. You've used {usage['used']} out of {usage['limit']} allowed today."
            )
        
        # Increment usage
        await stripe_service.increment_usage(
            user_id=current_user["id"],
            usage_type=limit_type
        )
        
        current_user["usage"] = usage
        return current_user
    
    return combined_checker


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def get_user_limits(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
) -> dict:
    """
    Get all usage limits and current usage for a user
    Useful for dashboard displays
    
    Returns:
        Dict with all limits and current usage
    """
    stripe_service = get_stripe_service(supabase)
    
    # Get subscription details
    subscription = await stripe_service.get_subscription_status(current_user["id"])
    
    # Get usage for all limit types
    usage_types = ["screening_runs", "analysis_runs", "chat_messages"]
    usage_data = {}
    
    for limit_type in usage_types:
        usage = await stripe_service.check_usage_limit(
            user_id=current_user["id"],
            limit_type=limit_type
        )
        usage_data[limit_type] = usage
    
    return {
        "subscription": subscription,
        "usage": usage_data
    }


async def can_use_feature(
    user_id: str,
    feature_name: str,
    supabase: Client
) -> bool:
    """
    Helper function to check feature access without raising exceptions
    Useful for conditional UI rendering
    
    Args:
        user_id: User's UUID
        feature_name: Feature to check
        supabase: Supabase client
        
    Returns:
        Boolean indicating access
    """
    stripe_service = get_stripe_service(supabase)
    return await stripe_service.check_feature_access(user_id, feature_name)


async def get_usage_summary(
    user_id: str,
    supabase: Client
) -> dict:
    """
    Get summary of user's current usage
    
    Args:
        user_id: User's UUID
        supabase: Supabase client
        
    Returns:
        Dict with usage summary
    """
    stripe_service = get_stripe_service(supabase)
    
    usage_types = ["screening_runs", "analysis_runs", "chat_messages"]
    summary = {}
    
    for limit_type in usage_types:
        usage = await stripe_service.check_usage_limit(user_id, limit_type)
        summary[limit_type] = usage
    
    return summary


# ============================================================================
# EXAMPLE USAGE IN ENDPOINTS
# ============================================================================

"""
Example 1: Require premium subscription
@router.get("/premium-feature")
async def premium_feature(user: dict = Depends(require_premium)):
    return {"message": "Welcome Premium user!"}


Example 2: Require specific feature
@router.get("/technical-analysis")
async def get_technicals(user: dict = Depends(require_technical_indicators)):
    # User has technical indicators access
    return calculate_indicators()


Example 3: Check and enforce usage limits
@router.post("/run-screen")
async def run_screen(user: dict = Depends(check_screening_limit)):
    # Usage checked and incremented automatically
    # user["usage"] contains current usage info
    return perform_screening()


Example 4: Combined feature + usage check
@router.post("/advanced-analysis")
async def advanced_analysis(
    user: dict = Depends(require_feature_and_usage("advanced_screening", "analysis_runs"))
):
    # User has feature access AND hasn't exceeded usage
    return perform_advanced_analysis()


Example 5: Manual check for conditional logic
@router.get("/dashboard")
async def dashboard(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    has_technicals = await can_use_feature(
        current_user["id"],
        "technical_indicators",
        supabase
    )
    
    return {
        "user": current_user,
        "features": {
            "technical_indicators": has_technicals
        }
    }
"""
