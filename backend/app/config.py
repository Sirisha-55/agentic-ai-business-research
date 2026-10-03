from pydantic_settings import BaseSettings, SettingsConfigDict


# Store all application configuration in one place
class Settings(BaseSettings):

    # Gemini API key
    GEMINI_API_KEY: str

    # Tavily Web Search API key
    TAVILY_API_KEY: str

    # PostgreSQL database connection URL
    DATABASE_URL: str

    # Read configuration values from the .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


# Create one settings object that can be used throughout the application
settings = Settings()