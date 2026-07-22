"""
Application Configuration
Loads settings from environment variables
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import os


class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # Application
    APP_NAME: str = "FundaKaMental API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_PORT: int = 8080
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # Database
    DATABASE_URL: str = ""
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENABLE_TEST_LOGIN: bool = False
    TEST_LOGIN_TOKEN: str = "dev-test-token"
    
    # OpenAI — secondary/fallback provider (gpt-4o balances quality and cost)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    # Anthropic — primary provider. Claude 3.5 Sonnet is strong at grounded,
    # structured financial extraction at a sane price (~$3/$15 per 1M tokens).
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
    
    # Stock Data APIs
    ALPHA_VANTAGE_API_KEY: str = ""
    FMP_API_KEY: str = ""  # Financial Modeling Prep
    POLYGON_API_KEY: str = ""

    # Razorpay (Pro subscription payments)
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # Scheduled stock-data refresh (Yahoo Finance -> `stocks` table).
    # Off by default so local dev doesn't call Yahoo on every restart; enable
    # in production. Runs every N hours; optionally once on startup.
    STOCK_REFRESH_ENABLED: bool = False
    STOCK_REFRESH_INTERVAL_HOURS: int = 24
    STOCK_REFRESH_ON_STARTUP: bool = False
    
    # Fyers API (Indian Markets)
    FYERS_APP_ID: str = ""
    FYERS_SECRET_ID: str = ""
    FYERS_REDIRECT_URI: str = "http://localhost:8080/callback"
    
    # Vector Database
    CHROMA_PERSIST_DIRECTORY: str = "./data/chroma"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 26214400  # 25MB
    
    # CORS - can be comma-separated string or list
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:8080,http://localhost:8081"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Stock API
    STOCK_API_KEY: str = ""
    STOCK_API_URL: str = ""
    
    @field_validator('CORS_ORIGINS', mode='after')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from string to list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def model_post_init(self, __context):
        """Create directories after model initialization"""
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)
        os.makedirs(self.CHROMA_PERSIST_DIRECTORY, exist_ok=True)


# Initialize settings
settings = Settings()
