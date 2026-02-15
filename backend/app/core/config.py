"""
Application Configuration
Loads settings from environment variables
"""
from pydantic_settings import BaseSettings
from typing import List
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
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
    ]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Stock API
    STOCK_API_KEY: str = ""
    STOCK_API_URL: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Create upload directory if it doesn't exist
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)
        os.makedirs(self.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
        
        # Parse CORS origins if it's a comma-separated string
        if isinstance(self.CORS_ORIGINS, str):
            self.CORS_ORIGINS = [
                origin.strip() 
                for origin in self.CORS_ORIGINS.split(",")
            ]


# Initialize settings
settings = Settings()
