"""
Authentication API Endpoints
Handles user registration, login, and profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
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


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
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
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )
        
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
        
    except Exception as e:
        error_message = str(e)
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
