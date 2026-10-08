from typing import Any, Callable

from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, START, END

from app.state import BusinessResearchState

from app.agents.planner import planner_agent
from app.agents.market import market_agent
from app.agents.company import company_agent
from app.agents.competitor import competitor_agent
from app.agents.analysis import analysis_agent
from app.agents.writer import writer_agent
from app.agents.reviewer import reviewer_agent
from app.agents.final_report import final_report_agent


# =========================================================
# PROGRESS CALLBACK
# =========================================================
#
# Sends live progress information to the FastAPI SSE layer.
#
# Frontend receives:
#
#     agent
#     status
#     message
#
# Example:
#
# Planner Agent
#   running
#   "Understanding the business objective..."
#
# Planner Agent
#   completed
#   "Produced 3 focused business research subtasks."
#
# =========================================================


def emit_progress(
    config: RunnableConfig,
    agent: str,
    status: str,
    message: str,
):
    """
    Send a progress event to the request-scoped SSE callback.
    """

    configurable = config.get("configurable", {})
    callback = configurable.get("progress_callback")

    if callback is not None:
        callback(
            {
                "agent": agent,
                "status": status,
                "message": message,
            }
        )


# =========================================================
# HELPER FUNCTIONS
# =========================================================


def normalize_task(task: Any) -> Any:
    """
    Convert common task objects into dictionaries when possible.
    """

    if hasattr(task, "model_dump"):
        try:
            return task.model_dump()
        except Exception:
            pass

    return task


def readable_task(task: Any) -> str:
    """
    Convert a Planner task into readable text for the live
    Agent Activity timeline.
    """

    task = normalize_task(task)

    if isinstance(task, dict):
        title = str(
            task.get("title")
            or task.get("name")
            or ""
        ).strip()

        description = str(
            task.get("description")
            or task.get("query")
            or task.get("objective")
            or ""
        ).strip()

        if title and description:
            return f"{title}: {description}"

        if title:
            return title

        if description:
            return description

    return str(task).strip()


def research_count(
    result: Any,
    keys: tuple[str, ...],
) -> int | None:
    """
    Return a count when the research result contains a list-like
    field such as findings or sources.

    Returns None when the result structure does not expose such
    a field.
    """

    result = normalize_task(result)

    if not isinstance(result, dict):
        return None

    for key in keys:
        value = result.get(key)

        if isinstance(value, (list, tuple, set)):
            return len(value)

    return None


# =========================================================
# PLANNER NODE
# =========================================================


def planner_node(
    state: BusinessResearchState,
    config: RunnableConfig,
):
    """
    Planner Agent:
    Understands the business question and creates focused
    research tasks.
    """

    emit_progress(
        config,
        "Planner Agent",
        "running",
        "Understanding the business objective and drafting an execution plan...",
    )

    user_query = state["user_query"]

    # Create the research plan.
    research_plan = planner_agent(user_query)

    task_count = len(research_plan)

    emit_progress(
        config,
        "Planner Agent",
        "completed",
        f"Produced {task_count} focused business research "
        f"subtask{'s' if task_count != 1 else ''}.",
    )

    return {
        "research_plan": research_plan
    }


# =========================================================
# MARKET RESEARCH NODE
# =========================================================


def market_node(
    state: BusinessResearchState,
    config: RunnableConfig,
):
    """
    Market Agent:
    Researches market conditions, trends, demand and
    relevant industry developments.
    """

    # Get the first task created by the Planner.
    task = state["research_plan"][0]

    task_description = readable_task(task)

    emit_progress(
        config,
        "Market Agent",
        "running",
        f"Researching the market task: {task_description}. "
        "Searching market size, growth, demand, trends and "
        "recent industry developments with Tavily web search...",
    )

    # Perform market research.
    results = market_agent(task)

    finding_count = research_count(
        results,
        (
            "findings",
            "research_findings",
            "results",
            "items",
        ),
    )

    source_count = research_count(
        results,
        (
            "sources",
            "source_urls",
            "references",
        ),
    )

    if finding_count is not None and source_count is not None:
        completed_message = (
            f"Gathered {finding_count} market finding"
            f"{'s' if finding_count != 1 else ''} "
            f"from {source_count} source"
            f"{'s' if source_count != 1 else ''}. "
            "Covered market size, growth, demand, trends and "
            "industry developments."
        )
    elif finding_count is not None:
        completed_message = (
            f"Gathered {finding_count} market finding"
            f"{'s' if finding_count != 1 else ''} "
            "covering market size, growth, demand, trends and "
            "industry developments."
        )
    else:
        completed_message = (
            "Gathered market research covering market size, "
            "growth, demand, trends and relevant industry "
            "developments."
        )

    emit_progress(
        config,
        "Market Agent",
        "completed",
        completed_message,
    )

    return {
        "market_research": results
    }


# =========================================================
# COMPANY RESEARCH NODE
# =========================================================


def company_node(
    state: BusinessResearchState,
    config: RunnableConfig,
):
    """
    Company Agent:
    Researches company profile, products, positioning,
    strategy and business context.
    """

    # Get the company research task.
    task = state["research_plan"][1]

    task_description = readable_task(task)

    emit_progress(
        config,
        "Company Agent",
        "running",
        f"Researching the company task: {task_description}. "
        "Investigating company profile, products, positioning, "
        "business performance and strategy...",
    )

    # Perform company research.
    results = company_agent(task)

    finding_count = research_count(
        results,
        (
            "findings",
            "research_findings",
            "results",
            "items",
        ),
    )

    source_count = research_count(
        results,
        (
            "sources",
            "source_urls",
            "references",
        ),
    )

    if finding_count is not None and source_count is not None:
        completed_message = (
            f"Gathered {finding_count} company finding"
            f"{'s' if finding_count != 1 else ''} "
            f"from {source_count} source"
            f"{'s' if source_count != 1 else ''}. "
            "Covered company profile, products, positioning, "
            "business direction and strategic context."
        )
    elif finding_count is not None:
        completed_message = (
            f"Gathered {finding_count} company finding"
            f"{'s' if finding_count != 1 else ''} "
            "covering company profile, products, positioning, "
            "business direction and strategy."
        )
    else:
        completed_message = (
            "Gathered company research covering company profile, "
            "products, positioning, business direction and strategy."
        )

    emit_progress(
        config,
        "Company Agent",
        "completed",
        completed_message,
    )

    return {
        "company_research": results
    }


# =========================================================
# COMPETITOR RESEARCH NODE
# =========================================================


def competitor_node(
    state: BusinessResearchState,
    config: RunnableConfig,
):
    """
    Competitor Agent:
    Identifies competitors and compares competitive
    positioning, differentiation and market gaps.
    """

    # Get the competitor research task.
    task = state["research_plan"][2]

    task_description = readable_task(task)

    emit_progress(
        config,
        "Competitor Agent",
        "running",
        f"Researching the competitor task: {task_description}. "
        "Identifying competitors and comparing positioning, "
        "differentiation, strengths, threats and market gaps...",
    )

    # Perform competitor research.
    results = competitor_agent(task)

    finding_count = research_count(
        results,
        (
            "findings",
            "research_findings",
            "results",
            "items",
        ),
    )

    source_count = research_count(
        results,
        (
            "sources",
            "source_urls",
            "references",
        ),
    )

    if finding_count is not None and source_count is not None:
        completed_message = (
            f"Gathered {finding_count} competitor finding"
            f"{'s' if finding_count != 1 else ''} "
            f"from {source_count} source"
            f"{'s' if source_count != 1 else ''}. "
            "Compared competitive positioning, differentiation, "
            "strategies, threats and market gaps."
        )
    elif finding_count is not None:
        completed_message = (
            f"Gathered {finding_count} competitor finding"
            f"{'s' if finding_count != 1 else ''} "
            "covering competitive positioning, differentiation, "
            "strategies and market gaps."
        )
    else:
        completed_message = (
            "Gathered competitor research covering competitive "
            "positioning, differentiation, strategies and market gaps."
        )

    emit_progress(
        config,
        "Competitor Agent",
        "completed",
        completed_message,
    )

    return {
        "competitor_research": results
    }


# =========================================================
# ANALYSIS NODE
# =========================================================


def analysis_node(
    state: BusinessResearchState,
    config: RunnableConfig,
):
    """
    Analysis Agent:
    Combines market, company and competitor research and
    extracts business insights.
    """

    emit_progress(
        config,
        "Analysis Agent",
        "running",
        "Analyzing market, company and competitor findings "
        "to identify trends, patterns, opportunities, risks "
        "and strategic insights...",
    )

    user_query = state["user_query"]

    market_research = state["market_research"]
    company_research = state["company_research"]
    competitor_research = state["competitor_research"]

    analysis = analysis_agent(
        user_query=user_query,
        market_research=market_research,
        company_research=company_research,
        competitor_research=competitor_research,
    )

    emit_progress(
        config,
        "Analysis Agent",
        "completed",
        "Identified key business insights, market opportunities, "
        "risks, trends and strategic patterns from the collected research.",
    )

    return {
        "analysis": analysis
    }


# =========================================================
# WRITER NODE
# =========================================================


def writer_node(
    state: BusinessResearchState,
    config: RunnableConfig,
):
    """
    Writer Agent:
    Converts the research and analysis into a structured
    business research report.
    """

    emit_progress(
        config,
        "Writer Agent",
        "running",
        "Writing the final business research report from "
        "the collected research and analysis...",
    )

    user_query = state["user_query"]

    analysis = state["analysis"]

    market_research = state["market_research"]
    company_research = state["company_research"]
    competitor_research = state["competitor_research"]

    # Previous reviewer feedback.
    review_feedback = state.get(
        "review_feedback",
        "",
    )

    # Previous draft for revision runs.
    previous_draft = state.get(
        "draft_report",
        "",
    )

    draft_report = writer_agent(
        user_query=user_query,
        analysis=analysis,
        market_research=market_research,
        company_research=company_research,
        competitor_research=competitor_research,
        previous_draft=previous_draft,
        review_feedback=review_feedback,
    )

    if previous_draft:
        writer_message = (
            "Revised the business research report using the "
            "reviewer's feedback and the collected evidence."
        )
    else:
        writer_message = (
            "Draft report written using the collected research, "
            "evidence and business analysis."
        )

    emit_progress(
        config,
        "Writer Agent",
        "completed",
        writer_message,
    )

    return {
        "draft_report": draft_report
    }


# =========================================================
# REVIEWER NODE
# =========================================================


def reviewer_node(
    state: BusinessResearchState,
    config: RunnableConfig,
):
    """
    Reviewer Agent:
    Checks whether the report answers the original business
    question and validates its quality.
    """

    emit_progress(
        config,
        "Reviewer Agent",
        "running",
        "Reviewing the report for completeness, clarity, "
        "consistency, relevance and factual support...",
    )

    user_query = state["user_query"]

    draft_report = state["draft_report"]

    # Reviewer checks the report against the actual user question.
    review_feedback = reviewer_agent(
        draft_report=draft_report,
        user_query=user_query,
    )

    revision_count = state.get(
        "revision_count",
        0,
    )

    revision_count += 1

    review_text = (
        review_feedback
        if isinstance(review_feedback, str)
        else str(review_feedback)
    )

    review_upper = review_text.strip().upper()

    if "APPROVED" in review_upper and "NEEDS_REVISION" not in review_upper:
        review_message = (
            "Review passed. The report meets the required "
            "completeness, relevance, consistency and "
            "evidence checks."
        )
    elif "NEEDS_REVISION" in review_upper:
        review_message = (
            "Review completed. Improvements are required "
            "before the report can be finalized."
        )
    else:
        review_message = (
            "Review completed. The report was checked for "
            "quality, relevance, consistency and evidence."
        )

    emit_progress(
        config,
        "Reviewer Agent",
        "completed",
        review_message,
    )

    return {
        "review_feedback": review_feedback,
        "revision_count": revision_count,
    }


# =========================================================
# REVIEW DECISION
# =========================================================


def review_decision(
    state: BusinessResearchState,
):
    """
    Decide whether the reviewed report should:

        Reviewer → Writer
        Reviewer → Final Report

    Maximum two revision cycles.
    """

    review_feedback = (
        state["review_feedback"]
        .strip()
        .upper()
    )

    revision_count = state.get(
        "revision_count",
        0,
    )

    # -----------------------------------------------------
    # NEEDS REVISION
    # -----------------------------------------------------

    # Check NEEDS_REVISION before APPROVED.
    #
    # This avoids accidental matching of APPROVED inside
    # a longer reviewer response.
    # -----------------------------------------------------

    if "NEEDS_REVISION" in review_feedback:

        if revision_count < 2:
            return "writer"

        return "final_report"

    # -----------------------------------------------------
    # APPROVED
    # -----------------------------------------------------

    if "APPROVED" in review_feedback:
        return "final_report"

    # -----------------------------------------------------
    # SAFETY FALLBACK
    # -----------------------------------------------------

    if revision_count >= 2:
        return "final_report"

    return "writer"


# =========================================================
# FINAL REPORT NODE
# =========================================================


def final_report_node(
    state: BusinessResearchState,
    config: RunnableConfig,
):
    """
    Final Report Agent:
    Produces the final reviewed report for delivery.
    """

    emit_progress(
        config,
        "Final Report Agent",
        "running",
        "Preparing the final reviewed business research "
        "report for delivery...",
    )

    draft_report = state["draft_report"]

    review_feedback = state["review_feedback"]

    final_report = final_report_agent(
        draft_report,
        review_feedback,
    )

    emit_progress(
        config,
        "Final Report Agent",
        "completed",
        "Final reviewed business research report is ready.",
    )

    return {
        "final_report": final_report
    }


# =========================================================
# CREATE LANGGRAPH WORKFLOW
# =========================================================


workflow = StateGraph(
    BusinessResearchState
)


# =========================================================
# ADD NODES
# =========================================================


workflow.add_node(
    "planner",
    planner_node,
)

workflow.add_node(
    "market",
    market_node,
)

workflow.add_node(
    "company",
    company_node,
)

workflow.add_node(
    "competitor",
    competitor_node,
)

workflow.add_node(
    "analysis",
    analysis_node,
)

workflow.add_node(
    "writer",
    writer_node,
)

workflow.add_node(
    "reviewer",
    reviewer_node,
)

workflow.add_node(
    "final_report",
    final_report_node,
)


# =========================================================
# START → PLANNER
# =========================================================


workflow.add_edge(
    START,
    "planner",
)


# =========================================================
# SEQUENTIAL BUSINESS RESEARCH FLOW
# =========================================================
#
# Planner
#    ↓
# Market
#    ↓
# Company
#    ↓
# Competitor
#    ↓
# Analysis
#    ↓
# Writer
#    ↓
# Reviewer
#    ↓
# Final Report
#
# Each agent starts only after the previous agent completes.
# =========================================================


workflow.add_edge(
    "planner",
    "market",
)

workflow.add_edge(
    "market",
    "company",
)

workflow.add_edge(
    "company",
    "competitor",
)

workflow.add_edge(
    "competitor",
    "analysis",
)


# =========================================================
# ANALYSIS → WRITER
# =========================================================


workflow.add_edge(
    "analysis",
    "writer",
)


# =========================================================
# WRITER → REVIEWER
# =========================================================


workflow.add_edge(
    "writer",
    "reviewer",
)


# =========================================================
# REVIEWER → CONDITIONAL DECISION
# =========================================================
#
# APPROVED:
#
# Reviewer → Final Report
#
# NEEDS_REVISION:
#
# Reviewer → Writer → Reviewer
#
# Maximum revision count = 2.
# =========================================================


workflow.add_conditional_edges(
    "reviewer",
    review_decision,
    {
        "writer": "writer",
        "final_report": "final_report",
    },
)


# =========================================================
# FINAL REPORT → END
# =========================================================


workflow.add_edge(
    "final_report",
    END,
)


# =========================================================
# COMPILE WORKFLOW
# =========================================================


research_graph = workflow.compile()


# =========================================================
# RUN COMPLETE BUSINESS RESEARCH
# =========================================================


def run_business_research(
    user_query: str,
    progress_callback: Callable[
        [dict[str, Any]],
        None,
    ] | None = None,
) -> dict:
    """
    Execute the complete business research workflow.

    The optional progress_callback is used by FastAPI to stream
    live agent updates to the frontend through SSE.
    """

    # -----------------------------------------------------
    # INITIAL STATE
    # -----------------------------------------------------

    initial_state = {
        "user_query": user_query,
        "revision_count": 0,
    }

    # -----------------------------------------------------
    # REQUEST-SCOPED CONFIG
    # -----------------------------------------------------

    config: RunnableConfig = {
        "configurable": {
            "progress_callback": progress_callback,
        }
    }

    # -----------------------------------------------------
    # EXECUTE COMPLETE WORKFLOW
    # -----------------------------------------------------

    result = research_graph.invoke(
        initial_state,
        config=config,
    )

    # -----------------------------------------------------
    # RETURN COMPLETE STATE
    # -----------------------------------------------------

    return result