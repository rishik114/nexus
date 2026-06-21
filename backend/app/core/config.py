from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Environment-driven settings. Create a `.env` file in /backend
    (see .env.example) with real values before running.
    """
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""  # server-only, bypasses RLS — never expose to frontend
    jwt_secret: str = "dev_secret_change_me"
    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
