from datetime import datetime, date, timedelta
from app.database import get_supabase
from app.services.transcription import extract_video_data
from app.services.ocr import extract_text_from_frames
from app.services.theme_extractor import extract_themes
from app.services.embeddings import embed_and_store_video


def _get_week_label(user_id, week_start, db):
    result = (db.table("videos").select("created_at").eq("user_id", user_id)
              .eq("status", "done").order("created_at").limit(1).execute())
    if not result.data:
        return "Week 1"
    first_date = datetime.fromisoformat(result.data[0]["created_at"].replace("Z", "+00:00")).date()
    first_monday = first_date - timedelta(days=first_date.weekday())
    return f"Week {(week_start - first_monday).days // 7 + 1}"


def _upsert_weekly_themes(user_id, themes, db):
    if not themes:
        return
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_label = _get_week_label(user_id, week_start, db)
    for theme_id in themes:
        existing = (db.table("themes_weekly").select("id, count")
                    .eq("user_id", user_id).eq("week_start", week_start.isoformat())
                    .eq("theme_id", theme_id).execute())
        if existing.data:
            db.table("themes_weekly").update({"count": existing.data[0]["count"] + 1,
                "updated_at": datetime.utcnow().isoformat()}).eq("id", existing.data[0]["id"]).execute()
        else:
            db.table("themes_weekly").insert({"user_id": user_id, "week_label": week_label,
                "week_start": week_start.isoformat(), "theme_id": theme_id, "count": 1}).execute()


def process_video(video_id: str, url: str, user_id: str) -> dict:
    db = get_supabase()
    db.table("videos").update({"status": "processing"}).eq("id", video_id).execute()
    try:
        print(f"[{video_id}] Extracting transcript...")
        video_data = extract_video_data(url)
        transcript = video_data.get("transcript")
        caption = video_data.get("caption")

        print(f"[{video_id}] Running OCR...")
        ocr_text = None
        try:
            ocr_text = extract_text_from_frames(url, num_frames=6)
        except Exception as e:
            print(f"[{video_id}] OCR non-fatal: {e}")

        text_parts = []
        if transcript: text_parts.append(f"TRANSCRIPT: {transcript}")
        if caption: text_parts.append(f"CAPTION: {caption}")
        if ocr_text: text_parts.append(f"ON-SCREEN TEXT: {ocr_text}")
        full_text = "\n\n".join(text_parts)

        print(f"[{video_id}] Extracting themes...")
        themes = extract_themes(full_text) if full_text else []

        update_data = {"status": "done", "transcript": transcript, "caption": caption,
            "ocr_text": ocr_text, "full_text": full_text, "theme_tags": themes,
            "processed_at": datetime.now().isoformat()}
        db.table("videos").update(update_data).eq("id", video_id).execute()

        if themes:
            _upsert_weekly_themes(user_id, themes, db)

        if full_text:
            print(f"[{video_id}] Embedding chunks for RAG...")
            embed_and_store_video(video_id, user_id, full_text)
        else:
            print(f"[{video_id}] No text to embed.")

        print(f"[{video_id}] ✅ Complete — themes: {themes}")
        return update_data
    except Exception as e:
        print(f"[{video_id}] ❌ Failed: {e}")
        db.table("videos").update({"status": "failed", "error_message": str(e)}).eq("id", video_id).execute()
        raise e