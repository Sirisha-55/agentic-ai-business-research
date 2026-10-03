from app.agents.planner import planner_agent


# Example business research request
user_query = """
Analyze the electric vehicle market in India,
including market trends, Tata Motors, and its competitors.
"""


# Run the Planner Agent
research_plan = planner_agent(user_query)


# Display the generated research plan
print("Research Plan:")

for index, task in enumerate(research_plan, start=1):
    print(f"{index}. {task}")