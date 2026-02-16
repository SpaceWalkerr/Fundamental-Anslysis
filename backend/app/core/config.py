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
    APP_NAME: str = "FundaVision API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_PORT: int = 8000
    
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
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    
    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-sonnet-20240229"
    
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
