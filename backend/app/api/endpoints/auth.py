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
    Register a new user
    """
    try:
        # Check if user already exists
        existing_user = db.table('users').select('id').eq('email', user_data.email).execute()
        
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user in Supabase Auth
        auth_response = db.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        user_id = auth_response.user.id
        
        # Create user profile in users table
        user_profile = {
            "id": user_id,
            "name": user_data.name,
            "email": user_data.email,
            "plan": "free",
            "reports_used": 0,
            "reports_limit": 5,
        }
        
        db.table('users').insert(user_profile).execute()
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user_id, "email": user_data.email}
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": user_id,
                "name": user_data.name,
                "email": user_data.email,
                "plan": "free",
                "reports_used": 0,
                "reports_limit": 5,
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Client = Depends(get_db)):
    """
    Login user and return JWT token
    """
    try:
        # Authenticate with Supabase
        auth_response = db.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password,
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        
        user_id = auth_response.user.id
        
        # Get user profile
        user_result = db.table('users').select('*').eq('id', user_id).single().execute()
        
        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User profile not found",
            )
        
        user = user_result.data
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user_id, "email": credentials.email}
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user
        )
        
    except HTTPException:
        raise
    except Exception as e:
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
    db: Client = Depends(get_db)
):
    """
    Logout user (client should discard token)
    """
    try:
        # Supabase sign out
        db.auth.sign_out()
        
        return {"message": "Successfully logged out"}
    except Exception as e:
        # Even if logout fails, client should discard token
        return {"message": "Logged out"}
