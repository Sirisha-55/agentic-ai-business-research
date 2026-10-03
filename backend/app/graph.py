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
# Sends live progress information to the FastAPI SSE layer.
#
# The frontend can therefore show:
#
# waiting
# running
# completed
# error
#
# for every agent in the workflow.
# =========================================================

def emit_progress(
    config: RunnableConfig,
    agent: str,
    status: str,
    message: str
):
    configurable = config.get("configurable", {})
    callback = configurable.get("progress_callback")

    if callback is not None:
        callback({
            "agent": agent,
            "status": status,
            "message": message
        })


# =========================================================
# PLANNER NODE
# =========================================================
# Converts the original business question into focused
# research tasks.
# =========================================================

def planner_node(
    state: BusinessResearchState,
    config: RunnableConfig
):

    emit_progress(
        config,
        "Planner Agent",
        "running",
        "Breaking the research question into focused tasks."
    )

    # Get the original user question.
    user_query = state["user_query"]

    # Generate the research plan.
    research_plan = planner_agent(user_query)

    emit_progress(
        config,
        "Planner Agent",
        "completed",
        "Research plan created."
    )

    # Store the plan in shared LangGraph state.
    return {
        "research_plan": research_plan
    }


# =========================================================
# MARKET RESEARCH NODE
# =========================================================
# Researches market size, growth, demand, trends,
# regulations and other market-level information.
# =========================================================

def market_node(
    state: BusinessResearchState,
    config: RunnableConfig
):

    emit_progress(
        config,
        "Market Agent",
        "running",
        "Researching market size, trends and demand."
    )

    # The Planner Agent creates the market task first.
    task = state["research_plan"][0]

    # Run market web research.
    results = market_agent(task)

    emit_progress(
        config,
        "Market Agent",
        "completed",
        "Market research completed."
    )

    return {
        "market_research": results
    }


# =========================================================
# COMPANY RESEARCH NODE
# =========================================================
# Researches important companies, products, business
# activity, expansion, partnerships and other company data.
# =========================================================

def company_node(
    state: BusinessResearchState,
    config: RunnableConfig
):

    emit_progress(
        config,
        "Company Agent",
        "running",
        "Collecting company and business information."
    )

    # The Planner Agent creates the company research task.
    task = state["research_plan"][1]

    # Run company research.
    results = company_agent(task)

    emit_progress(
        config,
        "Company Agent",
        "completed",
        "Company research completed."
    )

    return {
        "company_research": results
    }


# =========================================================
# COMPETITOR RESEARCH NODE
# =========================================================
# Identifies direct, indirect and emerging competitors
# and collects competitive information.
# =========================================================

def competitor_node(
    state: BusinessResearchState,
    config: RunnableConfig
):

    emit_progress(
        config,
        "Competitor Agent",
        "running",
        "Identifying competitors and comparing strategies."
    )

    # The Planner Agent creates the competitor research task.
    task = state["research_plan"][2]

    # Run competitor research.
    results = competitor_agent(task)

    emit_progress(
        config,
        "Competitor Agent",
        "completed",
        "Competitor research completed."
    )

    return {
        "competitor_research": results
    }


# =========================================================
# ANALYSIS NODE
# =========================================================
# Combines all research into deeper business analysis.
#
# The upgraded Analysis Agent performs:
#
# Research
#    ↓
# Evidence extraction
#    ↓
# Cross-source analysis
#    ↓
# Market gaps
#    ↓
# Opportunities
#    ↓
# Risks
#    ↓
# Strategic insights
# =========================================================

def analysis_node(
    state: BusinessResearchState,
    config: RunnableConfig
):

    emit_progress(
        config,
        "Analysis Agent",
        "running",
        "Connecting evidence and generating business insights."
    )

    # Get the original user question.
    user_query = state["user_query"]

    # Get all research collected by the parallel research agents.
    market_research = state["market_research"]
    company_research = state["company_research"]
    competitor_research = state["competitor_research"]

    # Generate the evidence-based analysis.
    analysis = analysis_agent(
        user_query=user_query,
        market_research=market_research,
        company_research=company_research,
        competitor_research=competitor_research
    )

    emit_progress(
        config,
        "Analysis Agent",
        "completed",
        "Research analysis completed."
    )

    return {
        "analysis": analysis
    }


# =========================================================
# WRITER NODE
# =========================================================
# Converts the analysis and raw research into a professional
# business research report.
#
# On the first execution:
#
# previous_draft = ""
# review_feedback = ""
#
# On revision:
#
# previous_draft = previous report
# review_feedback = reviewer feedback
#
# This allows the Writer Agent to improve the same report
# instead of generating an unrelated report from scratch.
# =========================================================

def writer_node(
    state: BusinessResearchState,
    config: RunnableConfig
):

    emit_progress(
        config,
        "Writer Agent",
        "running",
        "Preparing the structured business research report."
    )

    # Original user question.
    user_query = state["user_query"]

    # Analysis generated by the Analysis Agent.
    analysis = state["analysis"]

    # Raw research.
    market_research = state["market_research"]
    company_research = state["company_research"]
    competitor_research = state["competitor_research"]

    # Previous reviewer feedback.
    review_feedback = state.get(
        "review_feedback",
        ""
    )

    # Previous report draft.
    previous_draft = state.get(
        "draft_report",
        ""
    )

    # Generate either:
    #
    # 1. A first professional report
    #
    # OR
    #
    # 2. An improved report based on reviewer feedback.
    draft_report = writer_agent(
        user_query=user_query,
        analysis=analysis,
        market_research=market_research,
        company_research=company_research,
        competitor_research=competitor_research,
        previous_draft=previous_draft,
        review_feedback=review_feedback
    )

    emit_progress(
        config,
        "Writer Agent",
        "completed",
        "Business research report generated."
    )

    return {
        "draft_report": draft_report
    }


# =========================================================
# REVIEWER NODE
# =========================================================
# IMPORTANT:
#
# The Reviewer Agent now receives BOTH:
#
# - original user question
# - generated report
#
# This is important because the reviewer must determine
# whether the report actually answers what the user asked.
#
# Example:
#
# User asks:
# "Analyze the Indian EV market for a new entrant."
#
# A report can be well-written but still fail if it only
# describes EV companies without discussing:
#
# - market opportunity
# - customer demand
# - gaps
# - competition
# - risks
#
# Passing user_query allows the Reviewer Agent to detect
# these problems.
# =========================================================

def reviewer_node(
    state: BusinessResearchState,
    config: RunnableConfig
):

    emit_progress(
        config,
        "Reviewer Agent",
        "running",
        "Checking report completeness, evidence and business quality."
    )

    # Get the original user question.
    user_query = state["user_query"]

    # Get the current report draft.
    draft_report = state["draft_report"]

    # IMPORTANT:
    # Pass the original user question to the Reviewer Agent.
    #
    # New reviewer signature:
    #
    # reviewer_agent(
    #     draft_report,
    #     user_query
    # )
    #
    # This allows question-specific quality checking.
    review_feedback = reviewer_agent(
        draft_report=draft_report,
        user_query=user_query
    )

    # Get current revision count.
    revision_count = state.get(
        "revision_count",
        0
    )

    # Increase revision count after every review.
    revision_count += 1

    emit_progress(
        config,
        "Reviewer Agent",
        "completed",
        "Report quality review completed."
    )

    return {
        "review_feedback": review_feedback,
        "revision_count": revision_count
    }


# =========================================================
# REVIEW DECISION
# =========================================================
# Decides whether:
#
# reviewer → writer
#
# OR
#
# reviewer → final_report
#
# Maximum revisions are intentionally limited to 2 so that
# a weak or ambiguous reviewer response cannot create an
# infinite Writer ↔ Reviewer loop.
# =========================================================

def review_decision(
    state: BusinessResearchState
):

    # Get reviewer response.
    review_feedback = state["review_feedback"].strip().upper()

    # Get number of completed review cycles.
    revision_count = state.get(
        "revision_count",
        0
    )

    # -----------------------------------------------------
    # NEEDS REVISION
    # -----------------------------------------------------
    # Check this FIRST.
    #
    # This prevents accidental matching of "APPROVED"
    # inside a longer reviewer response.
    # -----------------------------------------------------

    if "NEEDS_REVISION" in review_feedback:

        # Allow up to two revision cycles.
        if revision_count < 2:
            return "writer"

        # After the maximum number of revisions,
        # continue to the final report stage.
        return "final_report"

    # -----------------------------------------------------
    # APPROVED
    # -----------------------------------------------------

    if "APPROVED" in review_feedback:
        return "final_report"

    # -----------------------------------------------------
    # SAFETY FALLBACK
    # -----------------------------------------------------
    # If the reviewer does not clearly return either status,
    # request another revision unless the maximum has already
    # been reached.
    # -----------------------------------------------------

    if revision_count >= 2:
        return "final_report"

    return "writer"


# =========================================================
# FINAL REPORT NODE
# =========================================================
# Takes the latest reviewed draft and prepares the final
# report that will be stored in PostgreSQL and returned
# to the frontend.
# =========================================================

def final_report_node(
    state: BusinessResearchState,
    config: RunnableConfig
):

    emit_progress(
        config,
        "Final Report Agent",
        "running",
        "Preparing the final reviewed business report."
    )

    # Get latest Writer output.
    draft_report = state["draft_report"]

    # Get latest Reviewer output.
    review_feedback = state["review_feedback"]

    # Final polishing / validation.
    final_report = final_report_agent(
        draft_report,
        review_feedback
    )

    emit_progress(
        config,
        "Final Report Agent",
        "completed",
        "Final business report is ready."
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
    planner_node
)

workflow.add_node(
    "market",
    market_node
)

workflow.add_node(
    "company",
    company_node
)

workflow.add_node(
    "competitor",
    competitor_node
)

workflow.add_node(
    "analysis",
    analysis_node
)

workflow.add_node(
    "writer",
    writer_node
)

workflow.add_node(
    "reviewer",
    reviewer_node
)

workflow.add_node(
    "final_report",
    final_report_node
)


# =========================================================
# START → PLANNER
# =========================================================

workflow.add_edge(
    START,
    "planner"
)


# =========================================================
# PLANNER → PARALLEL RESEARCH
# =========================================================
# These three research branches are independent.
#
# Conceptually:
#
#                 ┌→ Market
# Planner ────────┼→ Company
#                 └→ Competitor
#
# LangGraph waits for the required research branches
# before continuing to Analysis.
# =========================================================

workflow.add_edge(
    "planner",
    "market"
)

workflow.add_edge(
    "planner",
    "company"
)

workflow.add_edge(
    "planner",
    "competitor"
)


# =========================================================
# RESEARCH AGENTS → ANALYSIS
# =========================================================
# Analysis uses all three research outputs.
# =========================================================

workflow.add_edge(
    "market",
    "analysis"
)

workflow.add_edge(
    "company",
    "analysis"
)

workflow.add_edge(
    "competitor",
    "analysis"
)


# =========================================================
# ANALYSIS → WRITER
# =========================================================

workflow.add_edge(
    "analysis",
    "writer"
)


# =========================================================
# WRITER → REVIEWER
# =========================================================

workflow.add_edge(
    "writer",
    "reviewer"
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
        "final_report": "final_report"
    }
)


# =========================================================
# FINAL REPORT → END
# =========================================================

workflow.add_edge(
    "final_report",
    END
)


# =========================================================
# COMPILE WORKFLOW
# =========================================================

research_graph = workflow.compile()


# =========================================================
# RUN COMPLETE BUSINESS RESEARCH
# =========================================================
# This function is called by the FastAPI backend.
#
# It supports the live SSE progress system through the
# optional progress_callback.
# =========================================================

def run_business_research(
    user_query: str,
    progress_callback: Callable[[dict[str, Any]], None] | None = None
) -> dict:

    # -----------------------------------------------------
    # INITIAL STATE
    # -----------------------------------------------------
    # Only the original question and revision count are
    # required at the beginning.
    #
    # All other values are created by the graph nodes.
    # -----------------------------------------------------

    initial_state = {
        "user_query": user_query,
        "revision_count": 0
    }

    # -----------------------------------------------------
    # REQUEST-SCOPED CONFIG
    # -----------------------------------------------------
    # The progress callback is passed through LangGraph's
    # configurable runtime.
    #
    # If no callback is provided, the research workflow
    # still works normally.
    # -----------------------------------------------------

    config: RunnableConfig = {
        "configurable": {
            "progress_callback": progress_callback
        }
    }

    # -----------------------------------------------------
    # EXECUTE COMPLETE WORKFLOW
    # -----------------------------------------------------

    result = research_graph.invoke(
        initial_state,
        config=config
    )

    # -----------------------------------------------------
    # RETURN COMPLETE STATE
    # -----------------------------------------------------
    #
    # The result contains:
    #
    # user_query
    # research_plan
    # market_research
    # company_research
    # competitor_research
    # analysis
    # draft_report
    # review_feedback
    # revision_count
    # final_report
    #
    # The FastAPI layer uses final_report for PostgreSQL
    # persistence and frontend delivery.
    # -----------------------------------------------------

    return result