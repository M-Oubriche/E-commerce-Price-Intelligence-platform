from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
    # --- Infos Projet ---
    PROJECT_NAME: str = "PulsePrice API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    DATABASE_URL: Optional[str] = None
    REDIS_URL: Optional[str] = None
    
    JWT_SECRET: str = Field(default="dev_secret_key", alias="SECRET_KEY")

    # --- Database (POSTGRES POUR TON APPLICATION) ---
    # Ces variables correspondent exactement aux noms dans ton .env
    APP_POSTGRES_USER: str = "pulseprice_user"
    APP_POSTGRES_PASSWORD: str = "pulseprice_secret"
    APP_POSTGRES_DB: str = "pulseprice_db"
    APP_POSTGRES_HOST: str = "app_postgres"
    APP_POSTGRES_PORT: int = 5432

    # Variables de secours (utilisées par Airflow ou d'autres services)
    POSTGRES_USER: str = "airflow"
    POSTGRES_PASSWORD: str = "airflow_pass_secure"
    POSTGRES_DB: str = "airflow"
    POSTGRES_HOST: str = "app_postgres"
    POSTGRES_PORT: int = 5432

    # --- Cache (Redis) ---
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379

    # --- Email Service (Brevo) ---
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = "noreply@pulseprice.com"
    BREVO_SENDER_NAME: str = "PulsePrice"
    FRONTEND_URL: str = "http://localhost:4200"

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: str = Field(default="", alias="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str = Field(default="", alias="GOOGLE_CLIENT_SECRET")

    # --- Security (JWT) ---
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Configuration du chargeur
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True 
    )

settings = Settings()