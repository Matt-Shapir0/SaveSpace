"""
Generates a ~2 minute podcast script from the user's recent saved videos.
"""
import json
import re
import random
from datetime import datetime
from app.ai.gemini_client import client
from app.database import get_supabase

MODEL_NAME = "gemini-2.5-flash"
WORDS_PER_SECOND = 130 / 60  # ≈ 2.17 words/second

TONE_INSTRUCTIONS = {
    "gentle": (
        "Calm, warm, and unhurried. Like a thoughtful friend, less like a coach."
        "Sit with the idea — don't rush to resolve it."
    ),
    "motivational": (
        "Direct and specific. Build pressure toward the point. "
        "Challenge the listener but don't lecture them."
    ),
    "thoughtful": (
        "Exploratory and a little uncertain. Ask questions that don't have clean answers. "
        "More essay than speech."
    ),
}

DEFAULT_TONE = "Conversational and direct. Like someone talking to a friend, not presenting to an audience."

EPISODE_FORMATS = [
    {
        "name": "counterintuitive",
        "instruction": (
            "Open by naming something the listener probably believes or does, "
            "then complicate it — not to tear it down, but to look at it differently. "
            "Land on a more honest or nuanced version of the idea."
        ),
    },
    {
        "name": "observation",
        "instruction": (
            "Start with a specific, concrete observation about something in the content — "
            "something small and true that opens into something bigger. "
            "Stay close to the specific thing. Don't rush to the lesson."
        ),
    },
    {
        "name": "question",
        "instruction": (
            "Open with a question the listener has probably asked themselves. "
            "Don't answer it directly — explore why it's hard to answer, "
            "and end somewhere more useful than where you started."
        ),
    },
]

BANNED_PHRASES = [
    "on your journey", "you've got this", "it's okay", "be kind to yourself",
    "growth mindset", "show up", "lean in", "you are enough",
    "in this episode", "welcome back", "today we're talking about",
    "at the end of the day", "it's important to remember",
    "this week's episode", "let's dive in", "so powerful", "so important",
    "transformative", "game-changer", "life-changing",
]


def _estimate_segments(script: str) -> list[dict]:
    sentences = re.split(r'(?<=[.!?])\s+', script.strip())
    segments = []
    current_time = 0.0
    
    for sentence in sentences:
        if not sentence.strip():
            continue
        word_count = len(sentence.split())
        duration = word_count / WORDS_PER_SECOND
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

    # 1. Profile
    profile_result = db.table("profiles").select(
        "first_name, tone_preference, goals_array, interests_array"
    ).eq("id", user_id).execute()
    profile = profile_result.data[0] if profile_result.data else {}

    name = profile.get("first_name") or "you"
    tone_key = profile.get("tone_preference", "")
    tone_instruction = TONE_INSTRUCTIONS.get(tone_key, DEFAULT_TONE)
    goals = profile.get("goals_array") or []

    # 2. Recent processed videos
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

    # 3. Theme frequency
    all_themes: dict[str, int] = {}
    for v in videos:
        for t in (v.get("theme_tags") or []):
            all_themes[t] = all_themes.get(t, 0) + 1
    top_themes = sorted(all_themes, key=lambda t: -all_themes[t])[:4]

    idea_excerpts = []
    for v in videos[:10]:
        text = v.get("full_text") or v.get("caption") or ""
        if text:
            excerpt = text[:500].strip()
            if excerpt:
                idea_excerpts.append(excerpt)

    ideas_block = "\n\n".join(f"---\n{e}" for e in idea_excerpts[:6])

    # 5. Pick episode format (rotates so episodes vary over time)
    format_index = len(video_ids) % len(EPISODE_FORMATS)
    episode_format = EPISODE_FORMATS[format_index]

    goals_str = ", ".join(goals) if goals else "personal growth"
    banned = ", ".join(f'"{p}"' for p in BANNED_PHRASES)

    # 6. Two-step generation: identify the angle first
    angle_prompt = f"""You're going to write a short personal podcast episode.
Before writing, you need to find the single most interesting specific idea in this content.

CONTENT THE LISTENER HAS BEEN ABSORBING RECENTLY:
{ideas_block}

Find ONE specific, interesting idea, tension, or observation in this content.
Not a theme — a specific angle. Not "growth is hard" but something with more texture.

Write 2-3 sentences describing exactly what the episode will be about.
Be specific. If you can't name a concrete idea, you're still too vague.

Output only the angle description:"""

    angle_response = client.models.generate_content(
        model=MODEL_NAME,
        contents=angle_prompt,
        config={"temperature": 0.7},
    )
    chosen_angle = angle_response.text.strip()

    # Step 7: Write the script to that specific angle
    script_prompt = f"""Write a short personal audio episode using the angle below.

ANGLE TO WRITE ABOUT:
{chosen_angle}

LISTENER:
- Name: {name}
- Goals they care about: {goals_str}

TONE: {tone_instruction}

EPISODE FORMAT: {episode_format["instruction"]}

CRAFT RULES:
- Target 260-300 words. Not more.
- Write in second person ("you") — speaking directly to {name}
- Do NOT open with a greeting, intro, or "in this episode"
- Start directly in the content — first sentence should create a small hook
- One idea, followed through. Not a summary of themes.
- Concrete and specific beats abstract and general, always
- End on something that sits with the listener — a question, an observation, or a reframe
- No bullet points, no lists, no stage directions

BANNED PHRASES (do not use these or anything like them):
{banned}

Output only the script text:"""

    script_response = client.models.generate_content(
        model=MODEL_NAME,
        contents=script_prompt,
        config={
            "temperature": 0.9,
        },
    )
    script = script_response.text.strip()

    # 8. Title
    title_prompt = f"""Write a short episode title (4-7 words) for this podcast script.
Make it specific to what the episode actually says — not a generic mindset title.
Avoid: "The Power of X", "Why Y Matters", "How to Z".
Output only the title:

{script[:300]}"""

    title_response = client.models.generate_content(
        model=MODEL_NAME,
        contents=title_prompt,
        config={"temperature": 0.7},
    )
    title = title_response.text.strip().strip('"').strip("'")

    # 9. Karaoke segments
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