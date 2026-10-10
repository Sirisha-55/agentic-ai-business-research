from app.llm import generate_response


# Send a simple test prompt through our reusable LLM service
response = generate_response(
    "Explain what an AI agent is in one simple sentence."
)


# Display the generated response
print("LLM Response:")
print(response)