from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_publishable_key: str
    supabase_secret_key: str

    database_url: str
    google_api_key: str

    redis_url: str = "redis://localhost:6379/0"
    environment: str = "development"


    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()