"""
Generates a ~2 minute podcast script from the user's recent saved videos.

Design choices:
- Weaves themes in naturally — never "you saved a video about X"
- Reflects the user's tone preference (gentle / motivational / thoughtful)
- Prioritises most recently processed videos
- Targets ~300 words (≈ 2 min at 130 wpm)
- Returns script + title + themes + estimated karaoke segments
"""
import json
import re
from datetime import datetime
from app.ai.gemini_client import client
from app.database import get_supabase

WORDS_PER_SECOND = 130 / 60  # ≈ 2.17 words/second
MODEL_NAME = "gemini-2.5-flash"

TONE_INSTRUCTIONS = {
    "gentle": (
        "Speak with warmth and compassion. Use a calm, unhurried tone. "
        "Acknowledge difficulty gently. Invite rather than push."
    ),
    "motivational": (
        "Be direct, energising, and action-oriented. Use short punchy sentences. "
        "Challenge the listener in a positive way. Build momentum."
    ),
    "thoughtful": (
        "Ask reflective questions. Sit with ideas before resolving them. "
        "Use metaphor and nuance. Invite the listener to think, not just act."
    ),
}

DEFAULT_TONE = "Speak warmly and authentically. Balance reflection with encouragement."

def _estimate_segments(script: str) -> list[dict]:
    """
    Split script into sentences and assign estimated timestamps.
    Adds small pauses after sentence-ending punctuation.
    Returns list of {text, start_time, end_time}.
    """
    # Split into sentences (keep punctuation)
    sentences = re.split(r'(?<=[.!?])\s+', script.strip())
    segments = []
    current_time = 0.0

    for sentence in sentences:
        if not sentence.strip():
            continue
        word_count = len(sentence.split())
        duration = word_count / WORDS_PER_SECOND

        # Add a small pause at sentence ends
        if sentence.rstrip().endswith((".", "!", "?")):
            duration += 0.4

        segments.append({
            "text": sentence.strip(),
            "start_time": round(current_time, 2),
            "end_time": round(current_time + duration, 2),
        })
        current_time += duration

    return segments


def generate_podcast_script(user_id: str) -> dict:
    """
    Main entry point. Fetches user context + recent videos,
    generates a script with Gemini, returns structured data.

    Returns:
        {
            title: str,
            script: str,
            themes: list[str],
            segments: list[{text, start_time, end_time}],
            video_ids: list[str],
            estimated_duration: int  (seconds)
        }
    """
    db = get_supabase()

    # 1. Fetch user profile
    profile_result = db.table("profiles").select(
        "first_name, goals, tone_preference, interests_array, goals_array"
    ).eq("id", user_id).execute()
    profile = profile_result.data[0] if profile_result.data else {}

    name = profile.get("first_name") or "you"
    tone_key = profile.get("tone_preference", "")
    tone_instruction = TONE_INSTRUCTIONS.get(tone_key, DEFAULT_TONE)
    goals = profile.get("goals_array") or []
    interests = profile.get("interests_array") or []

    # 2. Fetch recent processed videos (newest first, up to 15)
    videos_result = (
        db.table("videos")
        .select("id, full_text, theme_tags, caption, created_at")
        .eq("user_id", user_id)
        .eq("status", "done")
        .order("created_at", desc=True)
        .limit(15)
        .execute()
    )
    videos = videos_result.data or []

    if not videos:
        raise ValueError("No processed videos found. Save and process some videos first.")

    video_ids = [v["id"] for v in videos]

    # 3. Collect theme context (what the user has been watching)
    all_themes: dict[str, int] = {}
    for v in videos:
        for t in (v.get("theme_tags") or []):
            all_themes[t] = all_themes.get(t, 0) + 1
    top_themes = sorted(all_themes, key=lambda t: -all_themes[t])[:4]

    # 4. Build theme-and-idea context from video content
    # Pull short excerpts — enough to flavour the script without overwhelming the prompt
    idea_excerpts = []
    for v in videos[:8]:  # top 8 most recent
        text = v.get("full_text") or v.get("caption") or ""
        if text:
            excerpt = text[:200].strip()
            if excerpt:
                idea_excerpts.append(excerpt)

    ideas_block = "\n".join(f"- {e}" for e in idea_excerpts[:6])

    # 5. Build the prompt
    goals_str = ", ".join(goals) if goals else "personal growth"
    interests_str = ", ".join(interests) if interests else "mindset and wellbeing"

    prompt = f"""You are writing a script for a personal mindset podcast episode.

LISTENER CONTEXT:
- Name: {name}
- Goals: {goals_str}
- Interests: {interests_str}
- Tone style: {tone_instruction}

RECENT THEMES the listener has been exploring (from their saved content):
{', '.join(top_themes) if top_themes else 'growth, motivation'}

IDEAS AND CONCEPTS they've been absorbing recently:
{ideas_block if ideas_block else '(general mindset and self-improvement content)'}

TASK:
Write a podcast script for a ~2 minute personal audio episode (target: 280-320 words).

RULES:
- Write in second person ("you", "your") — speaking directly to {name}
- NEVER say "you saved a video" or "based on your saved content" — weave ideas in naturally
- NEVER say "in this episode" or "welcome back" — start right in the content
- Reflect the ideas and themes above without quoting them directly
- Match the tone style precisely
- End with one grounding thought or question, not a call to action
- Output ONLY the script text — no title, no stage directions, no markdown

Begin the script now:"""

    response = client.models.generate_content(model=MODEL_NAME,contents=prompt)
    script = response.text.strip()

    # 6. Generate a title separately (short, evocative)
    title_prompt = f"""Give me a short podcast episode title (4-7 words) for this script.
Output ONLY the title, nothing else.

Script beginning: {script[:200]}"""

    title_response = client.models.generate_content(model=MODEL_NAME, contents=title_prompt)
    title = title_response.text.strip().strip('"').strip("'")

    # 7. Build segments for karaoke
    segments = _estimate_segments(script)
    estimated_duration = int(segments[-1]["end_time"]) + 2 if segments else 120

    return {
        "title": title,
        "script": script,
        "themes": top_themes,
        "segments": segments,
        "video_ids": video_ids,
        "estimated_duration": estimated_duration,
    }