import google.generativeai as genai
from app.config import settings

genai.configure(api_key=settings.google_api_key)

model = genai.GenerativeModel("gemini-1.5-flash")

def generate_podcast_script(text):
    prompt = f"""
    Turn the following TikTok content into a motivational podcast segment.

    {text}
    """
    response = model.generate_content(prompt)

    return response.text