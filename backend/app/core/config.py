import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Absolute path to backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_PATH = BACKEND_DIR / "valora.db"
GEMINI_KEY_FILE = BACKEND_DIR / ".gemini_key"

class Settings(BaseSettings):
    PROJECT_NAME: str = "VALORA AI — Shareholder Value Creation Analyzer"
    VERSION: str = "3.0.0"
    API_V1_STR: str = "/api/v1"
    
    # SQLite Database location - predictable, persistent local file
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}")
    
    # Gemini AI configuration
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
    GEMINI_TIMEOUT_SECONDS: int = 45
    
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    model_config = {
        "case_sensitive": True,
        "extra": "ignore"
    }

settings = Settings()

def get_gemini_api_key() -> str | None:
    """
    Retrieves the Gemini API key from environment variable or backend key file.
    Does not log or expose the raw key.
    """
    env_key = os.getenv("GEMINI_API_KEY")
    if env_key and env_key.strip():
        return env_key.strip()
    
    if GEMINI_KEY_FILE.exists():
        try:
            file_key = GEMINI_KEY_FILE.read_text(encoding="utf-8").strip()
            if file_key:
                return file_key
        except Exception:
            return None
    return None

def save_gemini_api_key(api_key: str) -> None:
    """
    Saves the Gemini API key securely in the backend local configuration file.
    """
    cleaned = api_key.strip()
    if not cleaned:
        raise ValueError("API key cannot be empty.")
    GEMINI_KEY_FILE.write_text(cleaned, encoding="utf-8")

def delete_gemini_api_key() -> bool:
    """
    Deletes the saved Gemini API key file.
    """
    if GEMINI_KEY_FILE.exists():
        try:
            GEMINI_KEY_FILE.unlink()
            return True
        except Exception:
            return False
    return False

def mask_api_key(api_key: str | None) -> str | None:
    """
    Masks the API key for safe presentation in status endpoints and UI.
    Example: 'AIzaSy...4f8x'
    """
    if not api_key:
        return None
    k = api_key.strip()
    if len(k) <= 8:
        return "********"
    return f"{k[:6]}...{k[-4:]}"
