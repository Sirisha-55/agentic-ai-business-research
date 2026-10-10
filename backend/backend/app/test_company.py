from app.agents.company import company_agent


# Example company research task
task = """
Analyze Tata Motors' electric vehicle business in India,
including its EV products, market position, sales,
strategy, manufacturing, and growth plans.
"""


# Run the Company Research Agent
results = company_agent(task)


# Display the collected research
print("Company Research Results:")

for index, result in enumerate(results, start=1):

    print(f"\n--- Result {index} ---")
    print("Title:", result["title"])
    print("URL:", result["url"])
    print("Content:", result["content"][:500])