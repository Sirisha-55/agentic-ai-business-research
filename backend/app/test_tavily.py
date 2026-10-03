from tavily import TavilyClient

from app.config import settings


# Create Tavily client using the API key from .env
client = TavilyClient(
    api_key=settings.TAVILY_API_KEY
)


# Perform a simple web search
response = client.search(
    query="latest AI industry trends 2026",
    max_results=3
)


# Display the search results
print("Tavily Search Results:")

for result in response["results"]:
    print("\nTitle:", result["title"])
    print("URL:", result["url"])
    print("Content:", result["content"][:300])