"""
Episodes endpoints:
  POST /episodes/generate          — trigger generation (background task)
  GET  /episodes/user/{user_id}    — list all episodes for a user
  GET  /episodes/{episode_id}      — get a single episode (for polling status)
  DELETE /episodes/{episode_id}    — delete an episode + its audio
"""
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from app.database import get_supabase
from app.services.podcast_generator import generate_podcast_script
from app.services.tts import generate_audio, upload_audio_to_storage

router = APIRouter()

# Background Task 
def _run_generation(episode_id: str, user_id: str):
    """
    Full pipeline: script → TTS → upload → update DB.
    Runs in a background thread so the HTTP response returns immediately.
    """
    db = get_supabase()

    try:
        print(f"[{episode_id}] Generating podcast script...")
        result = generate_podcast_script(user_id)

        print(f"[{episode_id}] Running TTS ({len(result['script'])} chars)...")

        # Fetch tone preference for voice selection
        profile = db.table("profiles").select("tone_preference").eq("id", user_id).execute()
        tone = profile.data[0].get("tone_preference", "") if profile.data else ""

        wav_bytes = generate_audio(result["script"], tone_preference=tone)

        print(f"[{episode_id}] Uploading audio ({len(wav_bytes)} bytes)...")
        audio_url = upload_audio_to_storage(db, user_id, episode_id, wav_bytes)

        # Update episode to done
        db.table("episodes").update({
            "status": "done",
            "title": result["title"],
            "script": result["script"],
            "segments": json.dumps(result["segments"]),
            "themes": result["themes"],
            "audio_url": audio_url,
            "audio_duration": result["estimated_duration"],
            "video_ids": result["video_ids"],
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", episode_id).execute()

        print(f"[{episode_id}] ✅ Episode done — {result['title']}")

    except Exception as e:
        error_msg = str(e)
        print(f"[{episode_id}] ❌ Generation failed: {error_msg}")
        db.table("episodes").update({
            "status": "failed",
            "error_message": error_msg,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", episode_id).execute()


# Request / Response models 
class GenerateRequest(BaseModel):
    user_id: str

@router.post("/generate")
async def generate_episode(payload: GenerateRequest, background_tasks: BackgroundTasks):
    """
    Create an episode record (status=generating) and kick off the background pipeline.
    Returns the episode_id immediately so the frontend can poll for completion.
    """
    db = get_supabase()

    # Check if there are enough processed videos
    video_count = (
        db.table("videos")
        .select("id", count="exact")
        .eq("user_id", payload.user_id)
        .eq("status", "done")
        .execute()
    )
    if (video_count.count or 0) < 1:
        raise HTTPException(
            status_code=400,
            detail="You need at least one processed video to generate a podcast episode."
        )

    # Create the episode record
    result = db.table("episodes").insert({
        "user_id": payload.user_id,
        "title": "Generating your episode…",
        "status": "generating",
    }).execute()

    episode = result.data[0]
    episode_id = episode["id"]

    # Run generation in background
    background_tasks.add_task(_run_generation, episode_id, payload.user_id)

    return {"episode_id": episode_id, "status": "generating"}


@router.get("/user/{user_id}")
def list_episodes(user_id: str):
    """Return all episodes for a user, newest first."""
    db = get_supabase()
    result = (
        db.table("episodes")
        .select("id, title, status, themes, audio_url, audio_duration, created_at, error_message")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.get("/{episode_id}")
def get_episode(episode_id: str):
    """Full episode detail including script and segments (for the player)."""
    db = get_supabase()
    result = (
        db.table("episodes")
        .select("*")
        .eq("id", episode_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Episode not found")

    episode = result.data[0]

    # segments is stored as jsonb — may come back as string in some supabase-py versions
    if isinstance(episode.get("segments"), str):
        episode["segments"] = json.loads(episode["segments"])

    return episode


@router.delete("/{episode_id}")
def delete_episode(episode_id: str):
    """Delete episode record and its audio from Storage."""
    db = get_supabase()

    # Get audio path before deleting
    result = db.table("episodes").select("user_id, audio_url").eq("id", episode_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Episode not found")

    episode = result.data[0]
    user_id = episode.get("user_id")

    # Remove audio from Storage
    if user_id and episode.get("audio_url"):
        try:
            file_path = f"{user_id}/{episode_id}.wav"
            db.storage.from_("episodes").remove([file_path])
        except Exception as e:
            print(f"Storage delete non-fatal: {e}")

    # Delete DB record
    db.table("episodes").delete().eq("id", episode_id).execute()
    return {"deleted": episode_id}
