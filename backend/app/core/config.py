from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Lemmy"
    DEBUG: bool = True

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 día

    class Config:
        env_file = ".env"

settings = Settings()