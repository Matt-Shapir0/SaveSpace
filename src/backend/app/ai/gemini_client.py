import google.genai as genai
from app.config import settings

client = genai.Client(api_key=settings.google_api_key)
MODEL_NAME = "gemini-2.5-flash"

def get_gemini_client():
    """Returns the configured Gemini model. Used by the chat router."""
    return client

def generate_podcast_script(text: str) -> str:
    prompt = f"""
Turn the following TikTok content into a motivational podcast segment.

{text}
"""
    response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
    return response.text