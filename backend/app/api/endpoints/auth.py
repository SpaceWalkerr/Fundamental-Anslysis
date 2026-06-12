"""
Authentication API Endpoints
Handles user registration, login, and profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from gotrue.errors import AuthApiError
from datetime import timedelta

from app.db.database import get_db
from app.models.schemas import (
    UserRegister,
    UserLogin,
    Token,
    UserResponse,
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
                    "company": "",
                    "email_notifications": True,
                    "marketing_emails": False,
                    "report_alerts": True,
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
        user_metadata = getattr(auth_response.user, 'user_metadata', {}) or {}
        
        return Token(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            expires_in=auth_response.session.expires_in,
            refresh_token=auth_response.session.refresh_token,
            user={
                "id": user['id'],
                "name": user['name'],
                "email": user['email'],
                "plan": user['plan'],
                "reports_used": user['reports_used'],
                "reports_limit": user['reports_limit'],
                "company": user_metadata.get('company') or "",
                "email_notifications": user_metadata.get('email_notifications') if user_metadata.get('email_notifications') is not None else True,
                "marketing_emails": user_metadata.get('marketing_emails') if user_metadata.get('marketing_emails') is not None else False,
                "report_alerts": user_metadata.get('report_alerts') if user_metadata.get('report_alerts') is not None else True,
            }
        )
        
    except AuthApiError as e:
        error_msg = str(e)
        print(f"AuthApiError during login: {error_msg}")
        if "confirm" in error_msg.lower() or "not confirmed" in error_msg.lower() or "verify" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is not verified. Please check your inbox and verify your email first.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
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
async def update_profile(
    profile_data: dict,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Update current user profile
    """
    user_id = current_user['id']
    name = profile_data.get('name')
    avatar_url = profile_data.get('avatar_url')
    
    update_data = {}
    if name is not None:
        update_data['name'] = name
    if avatar_url is not None:
        update_data['avatar_url'] = avatar_url
        
    if not update_data:
        return UserResponse(**current_user)
        
    try:
        # Update public.users table
        result = db.table('users').update(update_data).eq('id', user_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user profile",
            )
            
        updated_user = result.data[0]
        return UserResponse(**updated_user)
        
    except Exception as e:
        print(f"Profile update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user profile: {str(e)}",
        )


@router.delete("/me")
async def delete_user_account(
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Permanently delete current user account from auth.users (using Admin client)
    """
    user_id = current_user['id']
    try:
        # Import admin client to perform user deletion
        from app.db.database import get_supabase_admin_client
        admin_client = get_supabase_admin_client()
        
        # Deleting a user from auth.users cascades to public tables
        admin_client.auth.admin.delete_user(user_id)
        
        return {"message": "Account successfully deleted"}
    except Exception as e:
        print(f"Delete account error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}",
        )


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
