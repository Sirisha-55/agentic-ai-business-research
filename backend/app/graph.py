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

    **extra: Any,

):

    """Send a progress event, including optional task-level metadata, to SSE."""

    configurable = config.get("configurable", {})

    callback = configurable.get("progress_callback")

    if callback is not None:

        callback({

            "agent": agent,

            "status": status,

            "message": message,

            **extra,

        })

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

def task_focus(task: Any, max_length: int = 180) -> str:

    """Return the Planner-generated task title, falling back to its description."""

    task_data = normalize_task(task)

    if isinstance(task_data, dict):

        value = (

            task_data.get("title")

            or task_data.get("name")

            or task_data.get("description")

            or task_data.get("query")

            or task_data.get("objective")

            or ""

        )

    else:

        value = task_data

    text = " ".join(str(value).split()).strip()

    if len(text) > max_length:

        text = text[: max_length - 3].rstrip() + "..."

    return text or "the planned research task"

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

def task_input(task: Any) -> str:
    """Convert a planner task (including nested dictionaries) into agent input text."""
    data = normalize_task(task)

    def extract(value: Any) -> str:
        value = normalize_task(value)
        if isinstance(value, dict):
            for key in ("query", "objective", "description", "task", "title", "name", "content", "text"):
                candidate = value.get(key)
                if candidate is not None and candidate != "":
                    text_value = extract(candidate)
                    if text_value:
                        return text_value
            return ""
        if isinstance(value, (list, tuple)):
            return " ".join(part for part in (extract(item) for item in value) if part)
        return str(value).strip() if value is not None else ""

    result = extract(data)
    if result:
        return result
    # Last-resort fallback keeps the agent input a string without calling .strip() on a dict.
    return str(task).strip() if not isinstance(task, dict) else str(task)

def research_event_payload(result: Any) -> dict[str, Any]:

    """Normalize research output into the fields consumed by the Researcher tab."""

    normalized = normalize_task(result)

    if isinstance(normalized, dict):

        findings = normalized.get("findings")

        sources = normalized.get("sources")

        if findings is None:

            findings = normalized.get("results") or normalized.get("research") or normalized.get("content")

        if sources is None:

            sources = normalized.get("references") or normalized.get("citations") or []

    else:

        findings = normalized

        sources = []

    if findings is None:

        findings = []

    elif not isinstance(findings, (list, tuple)):

        findings = [findings]

    if sources is None:

        sources = []

    elif not isinstance(sources, (list, tuple)):

        sources = [sources]

    return {"findings": list(findings), "sources": list(sources), "result": normalized}

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

    # Create the research plan and attach stable IDs for the Execution Plan UI.

    raw_research_plan = planner_agent(user_query)

    research_plan = []

    for task_index, raw_task in enumerate(raw_research_plan, start=1):

        task = normalize_task(raw_task)

        if isinstance(task, dict):

            task = dict(task)

            task_id = str(task.get("id") or task.get("task_id") or f"task_{task_index}")

            task["id"] = task_id

            task["task_id"] = task_id

            task.setdefault("title", task.get("name") or task.get("description") or task.get("query") or f"Research task {task_index}")

            task.setdefault("task_status", "waiting")

        else:

            task_id = f"task_{task_index}"

            task = {

                "id": task_id,

                "task_id": task_id,

                "title": task_focus(task),

                "description": readable_task(task),

                "task_status": "waiting",

                "task": task,

            }

        research_plan.append(task)

    task_count = len(research_plan)

    emit_progress(

        config,

        "Planner Agent",

        "completed",

        f"Produced {task_count} focused business research "

        f"subtask{'s' if task_count != 1 else ''}.",

        data={"tasks": research_plan},

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

    """Research the first task produced by the Planner Agent."""

    plan = state.get("research_plan") or []

    if not plan:

        raise ValueError("Planner did not produce a market research task.")

    task = plan[0]

    task_data = normalize_task(task)

    task_id = str(task_data.get("task_id") or task_data.get("id") or "task_1") if isinstance(task_data, dict) else "task_1"

    focus = task_focus(task)

    emit_progress(config, "Planner Agent", "running", f"Starting planned task: {focus}", data={"task_id": task_id, "task_status": "running", "title": focus})

    emit_progress(

        config,

        "Market Agent",

        "running",

        f"Investigating the planned market task: {focus}...",

    )

    results = market_agent(task_input(task))

    emit_progress(config, "Planner Agent", "completed", f"Completed planned task: {focus}", data={"task_id": task_id, "task_status": "completed", "title": focus})

    emit_progress(

        config,

        "Market Agent",

        "completed",

        f"Completed market research for: {focus}",

        data=research_event_payload(results),

    )

    return {"market_research": results}

# COMPANY RESEARCH NODE

# =========================================================

def company_node(

    state: BusinessResearchState,

    config: RunnableConfig,

):

    """Research the second task produced by the Planner Agent."""

    plan = state.get("research_plan") or []

    if len(plan) < 2:

        raise ValueError(

            "Planner must produce at least two tasks for company research."

        )

    task = plan[1]

    task_data = normalize_task(task)

    task_id = str(task_data.get("task_id") or task_data.get("id") or "task_2") if isinstance(task_data, dict) else "task_2"

    focus = task_focus(task)

    emit_progress(config, "Planner Agent", "running", f"Starting planned task: {focus}", data={"task_id": task_id, "task_status": "running", "title": focus})

    emit_progress(

        config,

        "Company Agent",

        "running",

        f"Investigating company information for the planned task: {focus}...",

    )

    results = company_agent(task_input(task))

    emit_progress(config, "Planner Agent", "completed", f"Completed planned task: {focus}", data={"task_id": task_id, "task_status": "completed", "title": focus})

    emit_progress(

        config,

        "Company Agent",

        "completed",

        f"Completed company research for: {focus}",

        data=research_event_payload(results),

    )

    return {"company_research": results}

# COMPETITOR RESEARCH NODE

# =========================================================

def competitor_node(

    state: BusinessResearchState,

    config: RunnableConfig,

):

    """Research the third task produced by the Planner Agent."""

    plan = state.get("research_plan") or []

    if len(plan) < 3:

        raise ValueError(

            "Planner must produce at least three tasks for competitor research."

        )

    task = plan[2]

    task_data = normalize_task(task)

    task_id = str(task_data.get("task_id") or task_data.get("id") or "task_3") if isinstance(task_data, dict) else "task_3"

    focus = task_focus(task)

    emit_progress(config, "Planner Agent", "running", f"Starting planned task: {focus}", data={"task_id": task_id, "task_status": "running", "title": focus})

    emit_progress(

        config,

        "Competitor Agent",

        "running",

        f"Investigating competitors for the planned task: {focus}...",

    )

    results = competitor_agent(task_input(task))

    emit_progress(config, "Planner Agent", "completed", f"Completed planned task: {focus}", data={"task_id": task_id, "task_status": "completed", "title": focus})

    emit_progress(

        config,

        "Competitor Agent",

        "completed",

        f"Completed competitor research for: {focus}",

        data=research_event_payload(results),

    )

    return {"competitor_research": results}

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

        data={"analysis": analysis},

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

        data={"draft": draft_report, "revision": bool(previous_draft)},

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

    if isinstance(review_feedback, dict):

        review_text = str(

            review_feedback.get("feedback")

            or review_feedback.get("review")

            or review_feedback.get("content")

            or review_feedback.get("message")

            or review_feedback

        )

    else:

        review_text = str(review_feedback or "")

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

        data={"review": {"approved": "APPROVED" in review_upper and "NEEDS_REVISION" not in review_upper, "feedback": review_text, "revision_count": revision_count}},

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

    raw_feedback = state.get("review_feedback", "")
    if isinstance(raw_feedback, dict):
        raw_feedback = (
            raw_feedback.get("feedback")
            or raw_feedback.get("review")
            or raw_feedback.get("content")
            or raw_feedback.get("message")
            or str(raw_feedback)
        )
    review_feedback = str(raw_feedback or "").strip().upper()

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

        data={"final_report": final_report},

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
