from tavily import TavilyClient

from app.config import settings


# Create one reusable Tavily client for company-level research.
tavily_client = TavilyClient(
    api_key=settings.TAVILY_API_KEY
)


def company_agent(task: str) -> list[dict]:
    """
    Company Research Agent.

    The goal of this agent is not to produce a generic list of companies.
    It collects company-level evidence that can later be used by the
    Analysis and Writer agents.

    The search is intentionally divided into smaller focused queries.
    This gives Tavily a better chance of returning precise evidence for
    products, sales, pricing, market position, technology, partnerships,
    and recent developments.
    """

    # Keep the original research task as the main context.
    # The task may contain the user's exact business question.
    base_context = task.strip()

    # Targeted company research queries.
    #
    # Instead of sending one very large query, we ask Tavily several
    # focused questions. This improves retrieval quality and reduces
    # irrelevant results.
    search_queries = [
        f"""
        {base_context}

        Research the major companies directly relevant to this question
        in the Indian passenger electric vehicle market.

        Focus on:
        Tata Motors, Mahindra, JSW MG Motor India, Hyundai India,
        Kia India, BYD India and other directly relevant passenger EV
        manufacturers.

        Identify:
        - company role in the Indian passenger EV market
        - EV models currently relevant
        - vehicle segments
        - recent EV launches
        - target customer segments
        - current competitive position

        Prefer recent India-specific evidence from 2025 and 2026.
        """,

        f"""
        {base_context}

        Find reliable data about EV sales, registrations and market share
        of the major companies relevant to this research question in India.

        For every quantitative claim, identify:
        - company
        - metric
        - value
        - time period
        - source

        Distinguish monthly, quarterly and annual figures.
        Do not mix different periods.

        Prefer official company disclosures, government data,
        industry associations and reputable automotive/business sources.
        """,

        f"""
        {base_context}

        Research the EV product portfolios of the relevant companies
        operating in the Indian passenger EV market.

        Look for:
        - model names
        - vehicle segment
        - price information when reliably available
        - battery capacity when available
        - claimed range when available
        - charging capability
        - important technology/features
        - launch timing

        Use India-specific information and recent sources.
        Do not invent missing specifications.
        """,

        f"""
        {base_context}

        Research the competitive strategies of the major passenger EV
        companies relevant to this question.

        Look for evidence about:
        - manufacturing capacity
        - production expansion
        - battery technology
        - charging ecosystem
        - software/connected technology
        - partnerships
        - joint ventures
        - investments
        - localization
        - distribution/network expansion
        - geographic expansion

        Focus on developments from 2025 and 2026 where available.
        """,

        f"""
        {base_context}

        Research recent company developments relevant to the Indian
        passenger electric vehicle market.

        Find:
        - recent launches
        - new EV platforms
        - new factories
        - capacity expansion
        - battery or technology partnerships
        - strategic investments
        - collaborations
        - pricing changes
        - major business announcements

        Prioritize 2025 and 2026 information.
        Prefer primary sources and reputable Indian automotive/business
        publications.
        """,
    ]

    # Collect results from all focused searches.
    all_results = []

    for query in search_queries:

        try:
            response = tavily_client.search(
                query=query,
                max_results=5,
                search_depth="advanced"
            )

        except Exception as error:
            # Do not silently destroy the complete research pipeline if
            # one Tavily search fails.
            #
            # The remaining searches can still provide useful evidence.
            print(f"Company research search failed: {error}")
            continue

        for result in response.get("results", []):

            # Extract only the fields required by downstream agents.
            title = result.get("title", "")
            url = result.get("url", "")
            content = result.get("content", "")

            # Ignore incomplete search results.
            if not url or not content:
                continue

            all_results.append(
                {
                    "title": title,
                    "url": url,
                    "content": content,
                }
            )

    # Remove duplicate URLs.
    #
    # Multiple targeted searches may return the same article.
    # Keeping one copy prevents the Analysis Agent from over-weighting
    # the same source.
    unique_results = []
    seen_urls = set()

    for result in all_results:

        url = result["url"]

        if url in seen_urls:
            continue

        seen_urls.add(url)
        unique_results.append(result)

    # Keep the result set manageable for downstream LLM prompts.
    #
    # The first results come from the targeted searches above and are
    # therefore more relevant than an unrestricted large result set.
    return unique_results[:25]