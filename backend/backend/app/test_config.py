from app.config import settings


# Check whether the Gemini API key was loaded from .env
print("Gemini API Key loaded:", bool(settings.GEMINI_API_KEY))

# Check whether the Tavily API key was loaded from .env
print("Tavily API Key loaded:", bool(settings.TAVILY_API_KEY))

# Check whether the database URL was loaded from .env
print("Database URL loaded:", bool(settings.DATABASE_URL))