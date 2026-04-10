"""
Pipeline for Processing Videos!

Order:
1. Try native subtitles  (no video download — yt-dlp skip_download)
2. Fetch metadata        (no video download)
3. Download video once   (needed for OCR always + STT fallback if no subtitles)
4. Run Google STT        (only if no native subtitles, reuses downloaded file)
5. Run Gemini OCR        (reuses downloaded file)
6. Extract themes, embed, save
"""
import glob
import tempfile
from datetime import datetime, date, timedelta
import yt_dlp

from app.database import get_supabase
from app.services.transcription import try_native_transcript, transcribe_from_video_path, get_metadata
from app.services.ocr import extract_text_from_video_path
from app.services.theme_extractor import extract_themes
from app.services.embeddings import embed_and_store_video


def _download_video(url: str, tmpdir: str):
    """Shared download used by the whole pipeline. Returns path or None."""
    opts = {
        "format": "worst[ext=mp4]/worst",
        "outtmpl": f"{tmpdir}/video.%(ext)s",
        "quiet": True,
        "no_warnings": True,
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
            )
        },
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
        files = glob.glob(f"{tmpdir}/video.*")
        return files[0] if files else None
    except Exception as e:
        print(f"[download] Failed: {e}")
        return None


def _get_week_label(user_id, week_start, db):
    result = (
        db.table("videos").select("created_at")
        .eq("user_id", user_id).eq("status", "done")
        .order("created_at").limit(1).execute()
    )
    if not result.data:
        return "Week 1"
    first_date = datetime.fromisoformat(
        result.data[0]["created_at"].replace("Z", "+00:00")
    ).date()
    first_monday = first_date - timedelta(days=first_date.weekday())
    return f"Week {(week_start - first_monday).days // 7 + 1}"


def _upsert_weekly_themes(user_id, themes, db):
    if not themes:
        return
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_label = _get_week_label(user_id, week_start, db)
    for theme_id in themes:
        existing = (
            db.table("themes_weekly").select("id, count")
            .eq("user_id", user_id)
            .eq("week_start", week_start.isoformat())
            .eq("theme_id", theme_id).execute()
        )
        if existing.data:
            db.table("themes_weekly").update({
                "count": existing.data[0]["count"] + 1,
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            db.table("themes_weekly").insert({
                "user_id": user_id,
                "week_label": week_label,
                "week_start": week_start.isoformat(),
                "theme_id": theme_id,
                "count": 1,
            }).execute()


def process_video(video_id: str, url: str, user_id: str) -> dict:
    db = get_supabase()
    db.table("videos").update({"status": "processing"}).eq("id", video_id).execute()

    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            # 1. Native subtitles
            print(f"[{video_id}] Trying native subtitles...")
            transcript = try_native_transcript(url, tmpdir)

            # 2. Metadata
            metadata = get_metadata(url)
            caption = metadata.get("description") or metadata.get("title")

            # 3. Single download — for OCR and Transcript
            print(f"[{video_id}] Downloading video...")
            video_path = _download_video(url, tmpdir)

            # 4. Transcript
            if not transcript:
                if video_path:
                    print(f"[{video_id}] No native subtitles — running Google STT...")
                    transcript = transcribe_from_video_path(video_path)
                else:
                    print(f"[{video_id}] No video file — skipping STT fallback.")

            # 5. Gemini OCR
            ocr_text = None
            if video_path:
                print(f"[{video_id}] Running Gemini OCR...")
                try:
                    ocr_text = extract_text_from_video_path(video_path, num_frames=8)
                except Exception as e:
                    print(f"[{video_id}] OCR non-fatal error: {e}")
            else:
                print(f"[{video_id}] No video file — skipping OCR.")

            # 6. Combine
            text_parts = []
            if transcript: text_parts.append(f"TRANSCRIPT: {transcript}")
            if caption:    text_parts.append(f"CAPTION: {caption}")
            if ocr_text:   text_parts.append(f"ON-SCREEN TEXT: {ocr_text}")
            full_text = "\n\n".join(text_parts)

            # 7. Themes
            print(f"[{video_id}] Extracting themes...")
            themes = extract_themes(full_text) if full_text else []

            # 8. Save
            update_data = {
                "status": "done",
                "transcript": transcript,
                "caption": caption,
                "ocr_text": ocr_text,
                "full_text": full_text,
                "theme_tags": themes,
                "processed_at": datetime.now().isoformat(),
            }
            db.table("videos").update(update_data).eq("id", video_id).execute()

            if themes:
                _upsert_weekly_themes(user_id, themes, db)

            # 9. Embed for RAG
            if full_text:
                print(f"[{video_id}] Embedding for RAG...")
                embed_and_store_video(video_id, user_id, full_text)

            print(f"[{video_id}] ✅ Done — themes: {themes}")
            return update_data

        except Exception as e:
            print(f"[{video_id}] ❌ Failed: {e}")
            db.table("videos").update({
                "status": "failed",
                "error_message": str(e),
            }).eq("id", video_id).execute()
            raise