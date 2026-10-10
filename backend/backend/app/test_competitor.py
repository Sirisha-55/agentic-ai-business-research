from app.agents.competitor import competitor_agent


# Example competitor research task
task = """
Analyze Tata Motors' major electric vehicle competitors
in India, including Mahindra & Mahindra, MG Motor,
BYD, and Hyundai, focusing on products, pricing,
market position, and competitive strategy.
"""


# Run the Competitor Research Agent
results = competitor_agent(task)


# Display the collected competitor research
print("Competitor Research Results:")

for index, result in enumerate(results, start=1):

    print(f"\n--- Result {index} ---")
    print("Title:", result["title"])
    print("URL:", result["url"])
    print("Content:", result["content"][:500])