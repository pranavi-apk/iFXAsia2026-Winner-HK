"""
Configuration management for the application.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""

    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"  # Ignore extra fields from .env
    )

    # Application
    APP_NAME: str = "the global bank Investor Risk Assessment"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True

    # Storage
    DATA_DIR: str = "./data"
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 52428800  # 50MB

    # AI Services
    LLAMA_CLOUD_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
