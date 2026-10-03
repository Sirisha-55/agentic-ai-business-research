from tavily import TavilyClient

from app.config import settings


# Create one reusable Tavily client for competitor research.
tavily_client = TavilyClient(
    api_key=settings.TAVILY_API_KEY
)


def competitor_agent(task: str) -> list[dict]:
    """
    Competitor Research Agent.

    This agent performs focused competitive research instead of one
    broad search.

    The important distinction is between:
    1. Direct competitors:
       Companies selling passenger electric cars that overlap with
       the company/product being analysed.

    2. Adjacent competitors:
       Companies that are relevant to the wider EV ecosystem but
       do not directly compete in the same passenger-car segment.

    The user's research task determines which category is relevant.
    """

    # Preserve the exact research task because it tells the agent
    # what company, market and product category should be analysed.
    base_context = task.strip()

    # Use several focused searches instead of one very large query.
    #
    # This prevents Tavily from returning generic EV articles and
    # helps downstream agents build a more evidence-based comparison.
    search_queries = [

        # ---------------------------------------------------------
        # 1. Identify the actual direct competitors.
        # ---------------------------------------------------------
        f"""
        {base_context}

        Identify the major DIRECT competitors relevant to the
        user's research question.

        Determine competitors based on actual product and market
        overlap, not simply because they operate somewhere in the
        electric vehicle industry.

        For an Indian passenger EV question, focus primarily on
        companies selling electric passenger cars in India.

        Clearly distinguish:
        - direct competitors
        - adjacent competitors
        - broader EV ecosystem companies

        Do not treat electric two-wheeler manufacturers as direct
        competitors of passenger-car manufacturers unless the
        research task specifically requires that comparison.

        Provide evidence supporting why each company is relevant.
        """,

        # ---------------------------------------------------------
        # 2. Product and pricing comparison.
        # ---------------------------------------------------------
        f"""
        {base_context}

        Compare the major direct competitors in the relevant
        Indian electric vehicle segment.

        Research:
        - company
        - EV model
        - vehicle/body segment
        - starting price
        - relevant price range
        - battery capacity when available
        - claimed range when available
        - charging capability
        - important technology/features
        - launch date/year

        Use India-specific information.

        Do not invent specifications or prices.
        If a value cannot be reliably verified, leave it out.
        """,

        # ---------------------------------------------------------
        # 3. Sales and market position.
        # ---------------------------------------------------------
        f"""
        {base_context}

        Research the market position of the major direct competitors
        in India.

        Find reliable evidence for:
        - sales
        - registrations
        - market share
        - ranking/position
        - year-on-year growth
        - monthly or quarterly performance

        For every quantitative result, preserve:
        - exact metric
        - number
        - period
        - geography
        - source

        Do not mix:
        - monthly data with annual data
        - FY data with calendar-year data
        - retail sales with registrations

        Prefer FADA, Vahan, company disclosures, government sources
        and reputable automotive publications.
        """,

        # ---------------------------------------------------------
        # 4. Competitive strategy and differentiation.
        # ---------------------------------------------------------
        f"""
        {base_context}

        Analyse how the major direct competitors differentiate
        themselves in the Indian electric passenger vehicle market.

        Research evidence related to:
        - product strategy
        - pricing strategy
        - EV platform strategy
        - battery technology
        - software/connected features
        - charging ecosystem
        - manufacturing strategy
        - localization
        - dealership/service network
        - geographic expansion
        - customer segment
        - partnerships
        - investments

        Identify concrete differences between competitors.
        Avoid unsupported statements such as "best", "strongest"
        or "most advanced" unless a source explicitly supports
        the claim.
        """,

        # ---------------------------------------------------------
        # 5. Recent competitive developments.
        # ---------------------------------------------------------
        f"""
        {base_context}

        Find important competitive developments from 2025 and 2026.

        Look for:
        - new EV launches
        - facelifts or major product updates
        - new EV platforms
        - price changes
        - manufacturing plants
        - production/capacity expansion
        - battery investments
        - charging partnerships
        - technology partnerships
        - joint ventures
        - strategic investments
        - market-entry announcements
        - geographic expansion

        Prioritize recent primary or highly reliable sources.
        """,

        # ---------------------------------------------------------
        # 6. Competitive gaps and threat areas.
        # ---------------------------------------------------------
        f"""
        {base_context}

        Research evidence that can help identify competitive gaps
        and threat areas in the relevant Indian EV market.

        Look for:
        - underserved price segments
        - underserved customer segments
        - charging limitations
        - range limitations
        - product portfolio gaps
        - geographic gaps
        - service/network gaps
        - affordability issues
        - technology gaps
        - supply-chain constraints

        Clearly distinguish observed evidence from interpretation.
        Do not present speculation as fact.
        """,
    ]

    # Collect evidence from all focused searches.
    all_results = []

    for query in search_queries:

        try:
            response = tavily_client.search(
                query=query,
                max_results=5,
                search_depth="advanced"
            )

        except Exception as error:
            # A single failed search should not terminate the entire
            # competitor research process.
            print(f"Competitor research search failed: {error}")
            continue

        for result in response.get("results", []):

            title = result.get("title", "")
            url = result.get("url", "")
            content = result.get("content", "")

            # Ignore incomplete results because downstream agents
            # need both a source URL and useful source content.
            if not url or not content:
                continue

            all_results.append(
                {
                    "title": title,
                    "url": url,
                    "content": content,
                }
            )

    # -------------------------------------------------------------
    # Remove duplicate sources.
    # -------------------------------------------------------------
    #
    # The same article can appear in multiple targeted searches.
    # Keeping only one copy prevents the Analysis Agent from treating
    # the same evidence as multiple independent sources.
    unique_results = []
    seen_urls = set()

    for result in all_results:

        url = result["url"]

        if url in seen_urls:
            continue

        seen_urls.add(url)
        unique_results.append(result)

    # Keep the evidence set manageable for the downstream agents.
    #
    # The results are already ordered according to the focused
    # searches above, so the most relevant evidence is retained first.
    return unique_results[:30]