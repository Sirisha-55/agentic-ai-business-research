from typing import TypedDict, List, Dict


# Shared state passed between all agents in LangGraph workflow
class BusinessResearchState(TypedDict, total=False):

    # Original request from the user
    user_query: str

    # Research tasks created by Planner Agent
    research_plan: List[str]

    # Research collected by Market Agent
    market_research: List[Dict]

    # Research collected by Company Agent
    company_research: List[Dict]

    # Research collected by Competitor Agent
    competitor_research: List[Dict]

    # Combined analysis created by Analysis Agent
    analysis: str

    # Initial report created by Writer Agent
    draft_report: str

    # Feedback created by Reviewer Agent
    review_feedback: str

    # Final report created after review
    final_report: str

    # Number of times the report has been revised
    revision_count: int