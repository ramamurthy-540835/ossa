import os
from pathlib import Path
from pydantic import ConfigDict
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    app_name: str = "OSSA Agent Dashboard"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"

    # Paths
    base_dir: Path = Path(__file__).parent
    manifests_dir: Path = base_dir / "manifests"
    data_dir: Path = base_dir / "data"

    # API Keys
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")

    # Default provider
    default_provider: str = "gemini"

    # Server
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))

    model_config = ConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

def check_api_keys(s: Settings = None):
    """Verify required API keys are set"""
    if s is None:
        s = settings

    if not s.gemini_api_key and not s.google_api_key:
        print("⚠️  Warning: GEMINI_API_KEY or GOOGLE_API_KEY not set. Some features won't work.")
    if not s.gemini_api_key and not s.anthropic_api_key:
        if s.default_provider == "gemini":
            print("⚠️  Warning: GEMINI_API_KEY not set. Set it to use Gemini provider.")
        elif s.default_provider == "anthropic":
            print("⚠️  Warning: ANTHROPIC_API_KEY not set. Set it to use Claude provider.")
