from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ — relative paths (the SQLite file, .env) resolve against it, so the
# app behaves the same whether it's started from backend/ or the repo root.
BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    APP_NAME: str = "Lemmy"
    DEBUG: bool = True

    # Local SQLite file, relative to backend/. Swap for a Postgres URL
    # (plus a driver) and the rest of the code keeps working.
    DATABASE_URL: str = "sqlite:///./data/lemmy.db"

    # Dev-only default so the app starts with zero setup. Never use it outside localhost.
    SECRET_KEY: str = "dev-insecure-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 día

    # Comma-separated list, e.g. "http://localhost:5173,http://127.0.0.1:5173"
    CORS_ORIGINS: str = "http://localhost:5173"

    # External data (TRM and exchange rates). "off" (or false/0) makes the API skip every
    # outgoing request; the endpoints then answer with status "off" instead of data.
    LEMMY_EXTERNAL_DATA: bool = True

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    @field_validator("DATABASE_URL")
    @classmethod
    def _anchor_sqlite_path(cls, url: str) -> str:
        # "sqlite:///./data/lemmy.db" is relative to the current directory by
        # default; anchor it to backend/ instead. In-memory and absolute URLs pass through.
        prefix = "sqlite:///"
        if url.startswith(prefix) and not url.startswith(prefix + "/"):
            path = url[len(prefix):]
            if path and path != ":memory:" and not Path(path).is_absolute():
                return prefix + (BACKEND_DIR / path).resolve().as_posix()
        return url

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
