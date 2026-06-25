"""
Application Configuration
Loads settings from environment variables
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Any
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
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    
    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-opus-4-8"

    # Stock Data APIs
    ALPHA_VANTAGE_API_KEY: str = ""
    FMP_API_KEY: str = ""  # Financial Modeling Prep
    POLYGON_API_KEY: str = ""
    
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
    
    # CORS - comma-separated env var or JSON array, exposed to FastAPI as a list
    CORS_ORIGINS: Any = ["http://localhost:5173", "http://localhost:8080", "http://localhost:8081"]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Stock API
    STOCK_API_KEY: str = ""
    STOCK_API_URL: str = ""
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from string or json to list"""
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    import json
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
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
