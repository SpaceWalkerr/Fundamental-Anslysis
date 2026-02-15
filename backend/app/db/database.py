"""
Supabase Database Connection and Session Management
"""
from supabase import create_client, Client
from typing import Optional
from app.core.config import settings


# Global Supabase client
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get Supabase client instance (singleton pattern)
    """
    global _supabase_client
    
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
    
    return _supabase_client


def get_supabase_admin_client() -> Client:
    """
    Get Supabase admin client with service role key
    Use this for admin operations that bypass RLS
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY
    )


async def init_db():
    """
    Initialize database connection
    Called during application startup
    """
    try:
        # Test connection
        client = get_supabase_client()
        
        # Verify connection with a simple query
        # This will fail if credentials are wrong
        result = client.table('users').select('id').limit(1).execute()
        
        print(f"✅ Connected to Supabase: {settings.SUPABASE_URL}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {str(e)}")
        print("⚠️  Make sure your .env file has correct SUPABASE_URL and SUPABASE_KEY")
        # Don't raise exception - let app start anyway
        return False


async def close_db():
    """
    Close database connections
    Called during application shutdown
    """
    global _supabase_client
    _supabase_client = None
    print("✅ Database connections closed")


# Dependency for routes
async def get_db() -> Client:
    """
    Dependency to inject Supabase client into route handlers
    Usage: db: Client = Depends(get_db)
    """
    return get_supabase_client()
