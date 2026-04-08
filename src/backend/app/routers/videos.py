from fastapi import APIRouter, HTTPException
from app.models import VideoCreate, VideoResponse
from app.database import get_supabase
from app.worker.tasks import process_video_task
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

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

def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())

    if not parsed.scheme or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid URL")

    host = parsed.netloc.lower()
    clean_query = ""

    if "youtube.com" in host:
        allowed_query = [(key, value) for key, value in parse_qsl(parsed.query) if key == "v"]
        clean_query = urlencode(allowed_query)

    return urlunparse(
        (
            parsed.scheme.lower(),
            host,
            parsed.path.rstrip("/"),
            "",
            clean_query,
            "",
        )
    )

@router.post("/", response_model=VideoResponse, status_code=202)
async def create_video(payload: VideoCreate):
    db = get_supabase()
    normalized_url = normalize_url(payload.url)
    
    try:
        source = detect_source(normalized_url)
    except Exception as e:
        print("detect_source failed:", e)
        raise HTTPException(status_code=400, detail="Invalid URL source")

    # Check if this user already saved the normalized URL.
    existing = (
        db.table("videos")
        .select("*")
        .eq("user_id", payload.user_id)
        .eq("url", normalized_url)
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
            title=v.get("title"),
            author=v.get("author"),
            thumbnail_url=v.get("thumbnail_url"),
            transcript=v.get("transcript"),
            caption=v.get("caption"),
            error_message=v.get("error_message"),
            created_at=v.get("created_at"),
        )

    # Otherwise create a new video
    result = db.table("videos").insert({
        "user_id": payload.user_id,
        "url": normalized_url,
        "source": source,
        "status": "pending",
    }).execute()

    print("Insert result:", result)
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save video")

    video = result.data[0]
    video_id = video["id"]

    process_video_task.delay(video_id, normalized_url, payload.user_id)

    return VideoResponse(
        id=video_id,
        url=normalized_url,
        status="pending",
        source=source,
        title=video.get("title"),
        author=video.get("author"),
        thumbnail_url=video.get("thumbnail_url"),
        error_message=video.get("error_message"),
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
        title=v.get("title"),
        author=v.get("author"),
        thumbnail_url=v.get("thumbnail_url"),
        transcript=v.get("transcript"),
        caption=v.get("caption"),
        error_message=v.get("error_message"),
        created_at=v.get("created_at"),
    )

@router.get("/user/{user_id}")
def get_user_videos(user_id: str):
    """Get all videos for a user."""
    db = get_supabase()
    result = (
        db.table("videos")
        .select("id, url, source, status, title, author, thumbnail_url, caption, transcript, theme_tags, error_message, created_at")
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
