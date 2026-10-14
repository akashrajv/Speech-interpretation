import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    APP_NAME: str = "Counterpoint AI"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    APP_PORT: int = 8000
    FRONTEND_PORT: int = 5173

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    ENABLE_GEMINI: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./counterpoint.db"

    # Audio Storage
    AUDIO_STORAGE_DIR: str = str(BASE_DIR / "data" / "raw")
    PROCESSED_STORAGE_DIR: str = str(BASE_DIR / "data" / "processed")
    SAMPLES_STORAGE_DIR: str = str(BASE_DIR / "data" / "samples")
    MAX_UPLOAD_SIZE_MB: int = 50
    MAX_AUDIO_DURATION_SECONDS: int = 600

    # Rubric Weights
    WEIGHT_PACING: float = 0.25
    WEIGHT_PITCH: float = 0.20
    WEIGHT_VOLUME: float = 0.20
    WEIGHT_PRONUNCIATION: float = 0.20
    WEIGHT_EMPHASIS: float = 0.15

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.AUDIO_STORAGE_DIR, exist_ok=True)
os.makedirs(settings.PROCESSED_STORAGE_DIR, exist_ok=True)
os.makedirs(settings.SAMPLES_STORAGE_DIR, exist_ok=True)
