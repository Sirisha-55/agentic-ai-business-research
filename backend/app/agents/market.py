from tavily import TavilyClient

from app.config import settings


# Create a reusable Tavily client.
tavily_client = TavilyClient(
    api_key=settings.TAVILY_API_KEY
)


# Market Research Agent:
# Searches for market-specific information related to the user's research task.
def market_agent(task: str) -> list[dict]:

    # Add research-specific instructions so the search focuses
    # on actual market information instead of generic definitions.
    search_query = f"""
    {task}

    Find current and specific information about:
    - market size
    - market growth
    - market trends
    - market demand
    - major products or segments
    - recent developments
    - government policies or regulations if relevant
    - important statistics and numbers
    - opportunities and risks

    IMPORTANT CURRENCY INSTRUCTION:
    - Use Indian Rupees (INR / ₹) for ALL monetary values.
    - Do NOT use US Dollars ($ / USD) in the final research output.
    - If a source gives a value in USD, EUR, GBP, or another currency,
      convert it to Indian Rupees (INR / ₹) when presenting the information.
    - Clearly write monetary values using ₹ or INR.
    - Prefer sources that provide Indian market values in INR when available.

    Focus on the specific market, country, company, or industry
    mentioned in the task.

    Avoid generic explanations of what market research means.
    """

    # Search the web using Tavily.
    response = tavily_client.search(
        query=search_query,
        max_results=5
    )

    # Store useful research information.
    results = []

    for result in response.get("results", []):

        results.append(
            {
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "content": result.get("content", "")
            }
        )

    # Return the collected market research.
    return results