"""
Authentication and Security Utilities
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from supabase import Client

from app.core.config import settings
from app.db.database import get_db


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token security
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify JWT token
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get current authenticated user from Supabase Auth token
    Usage: current_user = Depends(get_current_user)
    """
    #token = credentials.credentials
    token = credentials.credentials

    print("=" * 50)
    print("TOKEN RECEIVED FROM FRONTEND:")
    print(repr(token))
    print("=" * 50)

# Force test login for development
    if token == "dev-test-token":
        print("TEST LOGIN ACCEPTED")
        return {
            "id": "80358c19-127d-45d2-aea4-3c02f0d1d038",
            "name": "Test User",
            "email": "test@example.com",
            "plan": "enterprise",
            "reports_used": 0,
            "reports_limit": 999,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
      }

    if (
        settings.ENABLE_TEST_LOGIN
        and settings.ENVIRONMENT.lower() != "production"
        and token == settings.TEST_LOGIN_TOKEN
    ):
        return {
    "id": "80358c19-127d-45d2-aea4-3c02f0d1d038",
    "name": "Test User",
    "email": "test@example.com",
    "plan": "enterprise",
    "reports_used": 0,
    "reports_limit": 5,
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow(),
}
    try:
        # Validate token with Supabase Auth
        user_response = db.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        
        user_id = user_response.user.id
        
        # Get user profile from public.users table
        result = db.table('users').select('*').eq('id', user_id).single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User profile not found",
            )
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Token validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_current_active_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current active user (can add more checks here)
    """
    # Add any additional checks (e.g., user is not banned, subscription is active, etc.)
    return current_user


def check_premium_user(user: Dict[str, Any]) -> bool:
    """Check if user has premium subscription"""
    return user.get("plan") in ["premium", "enterprise"]


async def require_premium(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Dependency to require premium subscription
    Usage: user = Depends(require_premium)
    """
    if not check_premium_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires a premium subscription",
        )
    return current_user
