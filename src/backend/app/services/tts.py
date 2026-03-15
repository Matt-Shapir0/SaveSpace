"""
Text-to-speech using Gemini 2.5 Flash TTS.
Returns a WAV file (bytes) ready to upload to Supabase Storage.

Gemini TTS returns raw PCM audio (24kHz, 16-bit, mono).
We wrap it in a WAV header so browsers can play it natively.

Voice options (pick based on tone):
  Kore    — calm, warm, female
  Aoede   — clear, steady, female
  Charon  — deep, measured, male
  Fenrir  — authoritative, male
  Puck    — bright, energetic, male
"""
import struct
import requests
import base64
from app.config import settings

GEMINI_TTS_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash-preview-tts:generateContent"
)

# Map tone preference → voice
TONE_VOICE_MAP = {
    "gentle": "Kore",
    "thoughtful": "Aoede",
    "motivational": "Fenrir",
}
DEFAULT_VOICE = "Kore"

SAMPLE_RATE = 24000   # Hz — Gemini TTS output rate
CHANNELS = 1          # mono
BITS_PER_SAMPLE = 16


def _pcm_to_wav(pcm_bytes: bytes) -> bytes:
    """Wrap raw PCM bytes in a standard WAV header."""
    data_size = len(pcm_bytes)
    byte_rate = SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE // 8
    block_align = CHANNELS * BITS_PER_SAMPLE // 8

    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,   # total file size - 8
        b"WAVE",
        b"fmt ",
        16,               # fmt chunk size
        1,                # PCM format
        CHANNELS,
        SAMPLE_RATE,
        byte_rate,
        block_align,
        BITS_PER_SAMPLE,
        b"data",
        data_size,
    )
    return header + pcm_bytes


def generate_audio(script: str, tone_preference: str = "") -> bytes:
    """
    Call Gemini TTS and return WAV bytes.
    Raises on API error.
    """
    voice = TONE_VOICE_MAP.get(tone_preference, DEFAULT_VOICE)

    payload = {
        "contents": [{"parts": [{"text": script}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": voice}
                }
            },
        },
    }

    response = requests.post(
        GEMINI_TTS_URL,
        json=payload,
        params={"key": settings.google_api_key},
        headers={"Content-Type": "application/json"},
        timeout=120,  # TTS can take 20-40s for a 2-minute script
    )

    if not response.ok:
        raise RuntimeError(
            f"Gemini TTS API error {response.status_code}: {response.text[:300]}"
        )

    data = response.json()

    try:
        audio_b64 = (
            data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
        )
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected TTS response shape: {e}\n{str(data)[:300]}")

    pcm_bytes = base64.b64decode(audio_b64)
    return _pcm_to_wav(pcm_bytes)


def upload_audio_to_storage(
    db,
    user_id: str,
    episode_id: str,
    wav_bytes: bytes,
) -> str:
    """
    Upload WAV to Supabase Storage bucket 'episodes'.
    Creates the bucket if it doesn't exist.
    Returns the public URL.
    """
    bucket_name = "episodes"
    file_path = f"{user_id}/{episode_id}.wav"

    # Create bucket if needed (idempotent — won't fail if it exists)
    try:
        db.storage.create_bucket(bucket_name, options={"public": True})
    except Exception:
        pass  # already exists

    # Upload
    db.storage.from_(bucket_name).upload(
        path=file_path,
        file=wav_bytes,
        file_options={"content-type": "audio/wav", "upsert": "true"},
    )

    # Get public URL
    url_response = db.storage.from_(bucket_name).get_public_url(file_path)
    return url_response
