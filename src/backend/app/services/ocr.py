"""
Service that extracts on-screen text from video frames using Gemini Vision.
"""
import cv2
import base64
from typing import Optional

from google import genai
from google.genai import types
from app.config import settings

client = genai.Client(api_key=settings.google_api_key)

def extract_text_from_video_path(video_path: str, num_frames: int = 2) -> Optional[str]:
    """
    Sample N frames from an already-downloaded video and extract all visible
    text using Gemini Vision in a single API call.

    Parameters:
        video_path: local path to the video file (managed by caller's tempdir)
        num_frames: frames to sample. 8 covers a 60s TikTok well.

    Returns:
        Clean string of all unique on-screen text, or None if nothing found.
    """
    frames_b64 = _sample_frames_as_b64(video_path, num_frames)
    if not frames_b64:
        return None
    return _extract_text_with_gemini(frames_b64)


def _sample_frames_as_b64(video_path: str, num_frames: int) -> list[str]:
    """
    Sample evenly-spaced frames, skipping the first/last 5% of the video
    (usually intros, outros, and watermark cards with no useful content).
    Returns frames as base64-encoded JPEGs.
    """
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if total == 0:
        cap.release()
        return []

    start = int(total * 0.05)
    end = int(total * 0.95)
    span = end - start

    indices = [start + int(i * span / num_frames) for i in range(num_frames)]
    frames_b64 = []

    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue
        success, buffer = cv2.imencode(
            ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85]
        )
        if success:
            frames_b64.append(base64.b64encode(buffer).decode("utf-8"))

    cap.release()
    return frames_b64


def _extract_text_with_gemini(frames_b64: list[str]) -> Optional[str]:
    """
    Send all frames to Gemini Vision in one call.
    Gemini deduplicates repeated overlays across frames naturally.
    """
    contents = [
        types.Part.from_bytes(data=b64, mime_type="image/jpeg")
        for b64 in frames_b64
    ]
    prompt = (
        "These are frames from a Short from Video. Extract ONLY unique on-screen text overlays, titles, and callouts. Ignore UI, watermarks, and captions. "
        "If none exist, reply with exactly: NONE. Output one item per line."
    )
    contents.append(types.Part.from_text(text=prompt))

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite-preview",
            contents=contents,
            config=types.GenerateContentConfig(temperature=0),
        )
        result = response.text.strip()

        if not result or result.upper() == "NONE":
            return None

        lines = [line.strip() for line in result.splitlines() if line.strip()]
        return " | ".join(lines) if lines else None

    except Exception as e:
        print(f"[OCR] Gemini vision call failed: {e}")
        return None