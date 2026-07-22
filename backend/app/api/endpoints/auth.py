"""
Authentication API Endpoints
Handles user registration, login, and profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from datetime import timedelta

from app.db.database import get_db, get_supabase_admin_client
from app.models.schemas import (
    UserRegister,
    UserLogin,
    Token,
    UserResponse,
    ProfileUpdate,
)
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user,
)
from app.core.config import settings


router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Client = Depends(get_db)):
    """
    Register a new user using Supabase Auth
    """
    try:
        # Use Supabase Auth to create user
        auth_response = db.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "name": user_data.name
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed. Email may already be in use."
            )
        
        user = auth_response.user
        session = auth_response.session
        
        # If email verification is enabled, session may be None
        if not session:
            return {
                "message": "Registration successful. Please verify your email before logging in.",
                "email_verification_required": True,
            }
        
        # Get user profile (created automatically by trigger)
        profile_result = db.table('users').select('*').eq('id', user.id).execute()
        
        if not profile_result.data:
            # Fallback: create profile manually if trigger failed
            profile = {
                "id": user.id,
                "email": user_data.email,
                "name": user_data.name,
                "plan": "free",
                "reports_used": 0,
                "reports_limit": 5,
            }
            db.table('users').insert(profile).execute()
        else:
            profile = profile_result.data[0]

        if session:
            return Token(
                access_token=session.access_token,
                token_type="bearer",
                expires_in=session.expires_in or settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                user={
                    "id": user.id,
                    "name": profile.get("name", user_data.name),
                    "email": user.email,
                    "plan": profile.get("plan", "free"),
                    "reports_used": profile.get("reports_used", 0),
                    "reports_limit": profile.get("reports_limit", 5),
                }
            )

            return {
                "message": "Registration successful. Please verify your email before logging in.",
                "email_verification_required": True,
            }
        
    except Exception as e:
        import traceback
        error_message = str(e)
        print(f"❌ Registration error: {error_message}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        if "already registered" in error_message.lower() or "already exists" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {error_message}"
        )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Client = Depends(get_db)):
    """
    Login user with Supabase Auth and return session token
    """
    try:
        # Sign in with Supabase Auth
        auth_response = db.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        if not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        
        # Get user profile from public.users table
        user_result = db.table('users').select('*').eq('id', auth_response.user.id).execute()
        
        if not user_result.data or len(user_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User profile not found",
            )
        
        user = user_result.data[0]
        
        return Token(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            expires_in=auth_response.session.expires_in,
            user={
                "id": user['id'],
                "name": user['name'],
                "email": user['email'],
                "plan": user['plan'],
                "reports_used": user['reports_used'],
                "reports_limit": user['reports_limit'],
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Log the error for debugging but return generic message
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get current user profile
    """
    return UserResponse(**current_user)


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    updates: ProfileUpdate,
    current_user: dict = Depends(get_current_active_user),
):
    """
    Update the logged-in user's editable profile fields (name, avatar_url).
    Writes via the service-role client so it works regardless of RLS.
    """
    user_id = current_user["id"]
    payload: dict = {}
    if updates.name is not None:
        name = updates.name.strip()
        if not (1 <= len(name) <= 80):
            raise HTTPException(status_code=400, detail="Name must be 1–80 characters")
        payload["name"] = name
    if updates.avatar_url is not None:
        payload["avatar_url"] = updates.avatar_url.strip() or None

    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    admin = get_supabase_admin_client()
    try:
        admin.table("users").update(payload).eq("id", user_id).execute()
        res = admin.table("users").select("*").eq("id", user_id).single().execute()
        row = res.data or {}
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {e}")

    merged = {**current_user, **row}
    return UserResponse(**merged)


@router.delete("/me")
async def delete_current_user(
    current_user: dict = Depends(get_current_active_user),
):
    """
    Permanently delete the user's account and all their data.

    FK constraints cascade from auth.users, but we also best-effort delete the
    top-level user-owned tables first so nothing is orphaned if a cascade is
    ever missing. Deleting the auth user is the authoritative, final step.
    """
    user_id = current_user["id"]
    admin = get_supabase_admin_client()

    def _safe(fn, label):
        try:
            fn()
        except Exception as e:  # pragma: no cover
            print(f"[delete_account] {label} cleanup failed: {e}")

    # Reports (cascades chat_messages + source_documents).
    _safe(lambda: admin.table("reports").delete().eq("user_id", user_id).execute(), "reports")
    # Portfolios (cascades holdings/transactions/snapshots/performance).
    _safe(lambda: admin.table("portfolios").delete().eq("user_id", user_id).execute(), "portfolios")
    # Watchlists new + legacy (cascades watchlist_items/snapshots).
    _safe(lambda: admin.table("watchlists").delete().eq("user_id", user_id).execute(), "watchlists")
    _safe(lambda: admin.table("watchlist").delete().eq("user_id", user_id).execute(), "watchlist")
    # Alerts + notifications.
    _safe(lambda: admin.table("price_alerts").delete().eq("user_id", user_id).execute(), "price_alerts")
    _safe(lambda: admin.table("signal_alerts").delete().eq("user_id", user_id).execute(), "signal_alerts")
    _safe(lambda: admin.table("notifications").delete().eq("user_id", user_id).execute(), "notifications")
    # Wallet + payment records.
    _safe(lambda: admin.table("ai_wallets").delete().eq("user_id", user_id).execute(), "ai_wallets")
    _safe(lambda: admin.table("token_pack_purchases").delete().eq("user_id", user_id).execute(), "token_pack_purchases")
    _safe(lambda: admin.table("pro_payments").delete().eq("user_id", user_id).execute(), "pro_payments")
    _safe(lambda: admin.table("subscriptions").delete().eq("user_id", user_id).execute(), "subscriptions")
    _safe(lambda: admin.table("payment_history").delete().eq("user_id", user_id).execute(), "payment_history")
    _safe(lambda: admin.table("feature_usage").delete().eq("user_id", user_id).execute(), "feature_usage")
    # Profile row.
    _safe(lambda: admin.table("users").delete().eq("id", user_id).execute(), "users")

    # Authoritative: remove the auth user (cascades anything left).
    try:
        admin.auth.admin.delete_user(user_id)
    except Exception as e:
        print(f"[delete_account] auth user delete failed: {e}")
        raise HTTPException(status_code=500, detail="Could not fully delete account. Contact support.")

    return {"success": True}


@router.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_active_user),
):
    """
    Logout user (client should discard token)
    Since we're using JWT tokens, there's no server-side session to invalidate.
    The client should discard the token.
    """
    return {"message": "Successfully logged out"}
