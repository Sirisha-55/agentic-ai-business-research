from app.agents.market import market_agent


# Example research task
task = """
Analyze the Indian electric vehicle market,
including current market trends, market growth,
consumer adoption, and government policies.
"""


# Run the Market Research Agent
results = market_agent(task)


# Display the collected research
print("Market Research Results:")

for index, result in enumerate(results, start=1):

    print(f"\n--- Result {index} ---")
    print("Title:", result["title"])
    print("URL:", result["url"])
    print("Content:", result["content"][:500])