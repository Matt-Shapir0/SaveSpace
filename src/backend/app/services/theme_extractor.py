"""
Extracts mindset themes from video transcript text using Gemini.
Maps content to a fixed set of theme IDs that match the frontend's themeColors.
"""
import json
from app.ai.gemini_client import client

MODEL_NAME = "gemini-2.5-flash"

VALID_THEMES = [
    "growth",        # Personal growth, learning, improvement
    "selfcare",      # Self-care, rest, wellness, boundaries
    "motivation",    # Drive, hustle, consistency, discipline
    "confidence",    # Self-belief, courage, overcoming fear
    "mindfulness",   # Presence, peace, meditation, gratitude
    "relationships", # Connection, love, friendship, community
]

THEME_DESCRIPTIONS = {
    "growth": "personal development, learning, becoming better, growth mindset",
    "selfcare": "rest, recovery, self-compassion, boundaries, mental health, wellness",
    "motivation": "hustle, discipline, consistency, drive, achieving goals, persistence",
    "confidence": "self-belief, courage, overcoming fear, self-worth, assertiveness",
    "mindfulness": "presence, peace, meditation, gratitude, calm, awareness",
    "relationships": "love, friendship, connection, community, empathy, communication",
}


def extract_themes(text: str) -> list[str]:
    """
    Given a video's full_text (transcript + caption + ocr), return
    a list of 1-3 theme IDs that best describe the content.
    Returns empty list if text is too short or extraction fails.
    """
    if not text or len(text.strip()) < 20:
        return []

    theme_list = "\n".join(
        f'- "{tid}": {desc}' for tid, desc in THEME_DESCRIPTIONS.items()
    )

    prompt = f"""Analyze this motivational/mindset content and identify which themes it covers.

CONTENT:
{text[:1500]}

AVAILABLE THEMES:
{theme_list}

Return ONLY a JSON array of 1-3 theme IDs from the list above that best match.
Example: ["growth", "motivation"]
If the content is not motivational or mindset-related, return: []

JSON array only, no explanation:"""

    try:
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        raw = response.text.strip()

        # Strip markdown code fences if present
        raw = raw.replace("```json", "").replace("```", "").strip()

        themes = json.loads(raw)

        # Validate — only return themes from our valid set
        return [t for t in themes if t in VALID_THEMES]

    except Exception as e:
        print(f"Theme extraction failed: {e}")
        return []
