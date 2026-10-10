import json
import re

from app.llm import generate_response


PLANNER_PROMPT = """You are the Planner Agent for a business research system.
Choose the number of focused subtasks that this question needs. Create at
least one and no more than six; do not add tasks just to reach a target count.
Assign every task to the best researcher: market, company, or competitor.
Use the market researcher for market/customer trends and outlook, the company
researcher for relevant organizations and offerings, and the competitor
researcher for alternatives, competitive position, challenges, or opportunities.

Make every title specific to the user's actual topic. Avoid generic titles
such as "Market research" or "Company research". Keep titles concise.
Descriptions should explain what evidence to collect for this question.
Each query should be a clear, self-contained web research query and should
retain the user's geography and time period when specified. Do not invent
geography or dates.

Return only a JSON array of one to six objects. Each object must have string
fields: title, description, query, researcher. The researcher value must be
market, company, or competitor.

User question:
"""


MAX_PLAN_TASKS = 6


def planner_agent(user_query: str) -> list[dict[str, str]]:
    query = user_query.strip()
    if not query:
        raise ValueError("A research question is required to create a plan.")

    response = generate_response(f"{PLANNER_PROMPT}\n{query}").strip()
    response = re.sub(r"^```(?:json)?\s*|\s*```$", "", response, flags=re.IGNORECASE)

    try:
        tasks = json.loads(response)
    except json.JSONDecodeError as error:
        raise ValueError("Planner Agent returned an invalid execution plan.") from error

    if isinstance(tasks, dict):
        tasks = tasks.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        raise ValueError("Planner Agent did not return any research subtasks.")

    normalized: list[dict[str, str]] = []
    for task in tasks[:MAX_PLAN_TASKS]:
        if not isinstance(task, dict):
            continue

        title = task.get("title")
        description = task.get("description")
        research_query = task.get("query")
        researcher = str(task.get("researcher", "")).strip().lower()
        if researcher in {"organizations", "organization", "companies"}:
            researcher = "company"
        if researcher in {"competition", "competitive", "competitors"}:
            researcher = "competitor"
        if researcher not in {"market", "company", "competitor"}:
            continue
        if not all(isinstance(value, str) and value.strip() for value in (title, description, research_query)):
            continue

        normalized.append({
            "id": str(len(normalized) + 1),
            "title": title.strip(),
            "description": description.strip(),
            "query": research_query.strip(),
            "researcher": researcher,
        })

    if not normalized:
        raise ValueError("Planner Agent did not return any usable research subtasks.")

    # Keep the visible plan and execution in the same fixed agent sequence.
    # Python's sort is stable, so tasks assigned to one agent retain the
    # Planner's original order.
    researcher_order = {"market": 0, "company": 1, "competitor": 2}
    normalized.sort(key=lambda task: researcher_order[task["researcher"]])
    for index, task in enumerate(normalized, start=1):
        task["id"] = str(index)

    return normalized
