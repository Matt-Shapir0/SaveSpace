from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models import VideoCreate, VideoResponse
from app.database import get_supabase
from app.worker.tasks import process_video_task
import re

router = APIRouter()

def detect_source(url: str) -> str:
    """Detect whether the URL is TikTok, Instagram, YouTube, etc."""
    if "tiktok.com" in url:
        return "tiktok"
    elif "instagram.com" in url:
        return "instagram"
    elif "youtube.com" in url or "youtu.be" in url:
        return "youtube"
    elif "twitter.com" in url or "x.com" in url:
        return "twitter"
    else:
        return "unknown"

@router.post("/", response_model=VideoResponse, status_code=202)
async def create_video(payload: VideoCreate):
    db = get_supabase()
    source = detect_source(payload.url)

    # Check if video already exists
    existing = (
        db.table("videos")
        .select("*")
        .eq("url", payload.url)
        .limit(1)
        .execute()
    )

    if existing.data:
        v = existing.data[0]
        return VideoResponse(
            id=v["id"],
            url=v["url"],
            status=v["status"],
            source=v.get("source"),
            transcript=v.get("transcript"),
            caption=v.get("caption"),
            created_at=v.get("created_at"),
        )

    # Otherwise create a new video
    result = db.table("videos").insert({
        "user_id": payload.user_id,
        "url": payload.url,
        "source": source,
        "status": "pending",
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save video")

    video = result.data[0]
    video_id = video["id"]

    process_video_task.delay(video_id, payload.url, payload.user_id)

    return VideoResponse(
        id=video_id,
        url=payload.url,
        status="pending",
        source=source,
        created_at=video["created_at"]
    )

@router.get("/{video_id}", response_model=VideoResponse)
def get_video(video_id: str):
    """Check the status of a specific video."""
    db = get_supabase()
    result = db.table("videos").select("*").eq("id", video_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Video not found")

    v = result.data[0]
    return VideoResponse(
        id=v["id"],
        url=v["url"],
        status=v["status"],
        source=v.get("source"),
        transcript=v.get("transcript"),
        caption=v.get("caption"),
        created_at=v.get("created_at"),
    )

@router.get("/user/{user_id}")
def get_user_videos(user_id: str):
    """Get all videos for a user."""
    db = get_supabase()
    result = (
        db.table("videos")
        .select("id, url, source, status, caption, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data

@router.delete("/{video_id}")
def delete_video(video_id: str):
    db = get_supabase()
    # Also delete associated chunks so RAG stays clean
    db.table("chunks").delete().eq("video_id", video_id).execute()
    result = db.table("videos").delete().eq("id", video_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"deleted": video_id}