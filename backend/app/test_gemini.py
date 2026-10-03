from google import genai

from app.config import settings


# Create Gemini client using the API key from .env
client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)


# Use the current Gemini 3.8 Flash model
# through Google's recommended Interactions API
interaction = client.interactions.create(
    model="gemini-3.8-flash",
    input="Say hello in one short sentence."
)


# Print the generated response
print("Gemini Response:")
print(interaction.output_text)