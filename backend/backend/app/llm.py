from google import genai
import time

from app.config import settings


# Custom error for Gemini rate-limit/quota problems
class LLMRateLimitError(Exception):
    pass


# Create Gemini client using the API key from .env
client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)


# Generate a response using Gemini
def generate_response(prompt: str) -> str:

    # Try the Gemini request up to 3 times
    for attempt in range(3):

        try:
            # Send the prompt to Gemini
            response = client.interactions.create(
                model="gemini-3.5-flash-lite",
                input=prompt
            )

            # Return the generated text
            return response.output_text

        except Exception as error:

            # Convert Gemini rate-limit errors into our custom error
            if "429" in str(error) or "Rate limit exceeded" in str(error):
                raise LLMRateLimitError(
                    "Gemini API rate limit exceeded. Please try again later."
                )

            # Retry temporary Gemini server errors
            if "503" in str(error) or "high demand" in str(error):

                # Increase the wait time for each retry
                wait_time = 3 * (attempt + 1)

                print(
                    f"Gemini temporarily unavailable. "
                    f"Retrying in {wait_time} seconds..."
                )

                time.sleep(wait_time)

            # Raise other errors immediately
            else:
                raise

    # All temporary retries failed
    raise RuntimeError(
        "Gemini is temporarily unavailable after 3 attempts."
    )