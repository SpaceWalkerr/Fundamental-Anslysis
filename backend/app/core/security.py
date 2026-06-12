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
    token = credentials.credentials

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
        user_data = None
        try:
            result = db.table('users').select('*').eq('id', user_id).single().execute()
            user_data = result.data
        except Exception as query_err:
            # PGRST116 or database exception when no row matches the ID
            print(f"Profile query exception (likely missing profile row): {str(query_err)}")
            user_data = None
            
        if not user_data:
            # Profile doesn't exist (e.g. Google Sign-In user after database reset)
            # Create the profile dynamically from validated token metadata
            email = user_response.user.email
            name = (
                user_response.user.user_metadata.get('full_name') or 
                user_response.user.user_metadata.get('name') or 
                (email.split('@')[0] if email else "OAuth User")
            )
            
            profile = {
                "id": user_id,
                "email": email,
                "name": name,
                "plan": "free",
                "reports_used": 0,
                "reports_limit": 5,
            }
            
            try:
                # Recreate profile row
                insert_result = db.table('users').insert(profile).execute()
                if insert_result.data and len(insert_result.data) > 0:
                    user_data = insert_result.data[0]
                else:
                    # If insert returns empty but succeeded, fetch again
                    user_data = profile
                
                # Recreate default watchlist for them on the fly
                try:
                    db.table('watchlists').insert({
                        "user_id": user_id,
                        "name": "My Watchlist",
                        "description": "Default watchlist for tracking stocks",
                        "is_default": True,
                        "color": "#3b82f6"
                    }).execute()
                except Exception as w_err:
                    print(f"Failed to create default watchlist on the fly: {str(w_err)}")
            except Exception as insert_err:
                print(f"Failed to auto-recreate user profile: {str(insert_err)}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User profile not found and could not be auto-recreated",
                )
        if user_data:
            user_data = dict(user_data)
            user_metadata = getattr(user_response.user, 'user_metadata', {}) or {}
            user_data['company'] = user_metadata.get('company') or ""
            user_data['email_notifications'] = user_metadata.get('email_notifications') if user_metadata.get('email_notifications') is not None else True
            user_data['marketing_emails'] = user_metadata.get('marketing_emails') if user_metadata.get('marketing_emails') is not None else False
            user_data['report_alerts'] = user_metadata.get('report_alerts') if user_metadata.get('report_alerts') is not None else True

        return user_data
        
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
