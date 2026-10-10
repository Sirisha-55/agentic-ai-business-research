from app.graph import research_graph


# Example business research request
user_query = """
Analyze the electric vehicle market in India,
including market trends, Tata Motors, and its competitors.
"""


# Execute the complete research workflow
result = research_graph.invoke(
    {
        "user_query": user_query
    }
)


# Display the research plan
print("\n========== RESEARCH PLAN ==========")

for index, task in enumerate(
    result["research_plan"],
    start=1
):
    print(f"{index}. {task}")


# Display number of results collected
print("\n========== RESEARCH RESULTS ==========")

print(
    "Market results:",
    len(result.get("market_research", []))
)

print(
    "Company results:",
    len(result.get("company_research", []))
)

print(
    "Competitor results:",
    len(result.get("competitor_research", []))
)