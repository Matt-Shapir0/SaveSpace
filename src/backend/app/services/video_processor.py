"""
Orchestrates the full pipeline for a single video:
1. Extract transcript (native subtitles first, Whisper fallback)
2. Extract caption/metadata
3. Extract OCR text from frames
4. Combine into full_text
5. Update the DB record
"""
from app.database import get_supabase
from app.services.transcription import extract_video_data
from app.services.ocr import extract_text_from_frames
from datetime import datetime

def process_video(video_id: str, url: str, user_id: str) -> dict:
    """
    Full processing pipeline for a video.
    Called by the Celery task or BackgroundTask.
    Returns final video data dict.
    """
    db = get_supabase()

    # Mark as processing
    db.table("videos").update({
        "status": "processing"
    }).eq("id", video_id).execute()

    try:
        print(f"[{video_id}] Starting extraction for: {url}")

        # Step 1: Extract transcript and metadata
        print(f"[{video_id}] Extracting transcript and metadata...")
        video_data = extract_video_data(url)
        
        transcript = video_data.get("transcript")
        caption = video_data.get("caption")
        
        print(f"[{video_id}] Transcript found: {'Yes' if transcript else 'No (will use Whisper)'}")
        print(f"[{video_id}] Caption: {caption[:80] if caption else 'None'}...")

        # Step 2: OCR text from video frames
        # Note: OCR takes ~10-20 seconds. Skip if transcript is already very good.
        # You can disable this initially and enable it later.
        print(f"[{video_id}] Running OCR on video frames...")
        ocr_text = None
        try:
            ocr_text = extract_text_from_frames(url, num_frames=2)
            print(f"[{video_id}] OCR text found: {'Yes' if ocr_text else 'No'}")
        except Exception as e:
            print(f"[{video_id}] OCR failed (non-fatal): {e}")

        # Step 3: Combine all text sources
        # Priority: transcript > caption > ocr
        text_parts = []
        if transcript:
            text_parts.append(f"TRANSCRIPT: {transcript}")
        if caption:
            text_parts.append(f"CAPTION: {caption}")
        if ocr_text:
            text_parts.append(f"ON-SCREEN TEXT: {ocr_text}")
        
        full_text = "\n\n".join(text_parts)

        # Step 4: Save everything to DB
        update_data = {
            "status": "done",
            "transcript": transcript,
            "caption": caption,
            "ocr_text": ocr_text,
            "full_text": full_text,
            "processed_at": datetime.utcnow().isoformat(),
        }

        db.table("videos").update(update_data).eq("id", video_id).execute()
        print(f"[{video_id}] ✅ Processing complete")

        # Step 5: Kick off embedding (will implement in AI step)
        # embed_and_store_chunks.delay(video_id, full_text, user_id)

        return update_data

    except Exception as e:
        error_msg = str(e)
        print(f"[{video_id}] ❌ Processing failed: {error_msg}")
        
        db.table("videos").update({
            "status": "failed",
            "error_message": error_msg,
        }).eq("id", video_id).execute()
        
        raise e