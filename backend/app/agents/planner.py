# Planner Agent
# Creates three specific research tasks from the user's query.
#
# We intentionally do not use the LLM here.
# This guarantees that the research tasks remain specific
# and are never reduced to generic names such as:
# "Market research", "Company research", "Competitor research".


def planner_agent(user_query: str) -> list[str]:

    # Remove unnecessary whitespace from the user's query.
    query = user_query.strip()

    # Create a specific market research task.
    market_task = (
        f"{query}. "
        f"Research the specific market or industry mentioned in the query, "
        f"including market size, growth, demand, major segments, trends, "
        f"sales or adoption data, recent developments, government policies, "
        f"regulations, opportunities, and risks. "
        f"Focus on India and recent 2025-2026 information where applicable."
    )

    # Create a specific company research task.
    company_task = (
        f"{query}. "
        f"Research the major companies relevant to this topic, including "
        f"their products or services, business model, market position, "
        f"sales or revenue where available, important products, recent "
        f"developments, partnerships, expansion plans, strengths, and "
        f"challenges. Focus on India and recent information where applicable."
    )

    # Create a specific competitor research task.
    competitor_task = (
        f"{query}. "
        f"Identify the major direct and indirect competitors relevant to "
        f"the topic. Compare their products, pricing where available, "
        f"sales, market share, product features, geographic presence, "
        f"competitive strengths, weaknesses, recent launches, and strategic "
        f"developments. Focus on the Indian market and recent information."
    )

    # Return exactly three tasks because the LangGraph workflow
    # expects:
    # [0] Market
    # [1] Company
    # [2] Competitor
    return [
        market_task,
        company_task,
        competitor_task
    ]