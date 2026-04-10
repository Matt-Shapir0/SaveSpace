"""
Transcript extraction

Public API:
    try_native_transcript(url, tmpdir)   -> Optional[str]  (no video download)
    transcribe_from_video_path(path)     -> Optional[str]  (reuses downloaded file)
    get_metadata(url)                    -> dict            (no video download)
"""
import glob
import json
import os
import re
import subprocess
import tempfile
from typing import Dict, Optional

import yt_dlp
from google.cloud import speech
from google.oauth2 import service_account
from yt_dlp.utils import DownloadError

# NEW IMPORTS?  ##############################################
import os
import time
import subprocess
from typing import Optional
from google import genai
from google.genai import types
from app.config import settings

# Initialize the modern client once
client = genai.Client(api_key=settings.google_api_key)
#############################################################


def _get_speech_client():
    if "GOOGLE_APPLICATION_CREDENTIALS" in os.environ:
        data = json.loads(os.environ["GOOGLE_APPLICATION_CREDENTIALS"])
        credentials = service_account.Credentials.from_service_account_info(data)
        return speech.SpeechClient(credentials=credentials)
    raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS not set")


def try_native_transcript(url: str, tmpdir: str) -> Optional[str]:
    """
    Attempt to pull native subtitles or auto-captions via yt-dlp.
    Does NOT download the video — uses skip_download=True.
    Returns transcript text or None if unavailable.
    """
    opts = {
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitlesformat": "json3",
        "subtitleslangs": ["en", "en-US", "en-GB"],
        "skip_download": True,
        "outtmpl": f"{tmpdir}/subs",
        "quiet": True,
        "no_warnings": True,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception as e:
        print(f"[transcription] Subtitle extraction error: {e}")
        return None

    sub_files = (
        glob.glob(f"{tmpdir}/subs*.json3")
        + glob.glob(f"{tmpdir}/subs*.vtt")
        + glob.glob(f"{tmpdir}/subs*.srt")
    )
    if not sub_files:
        return None

    path = sub_files[0]
    if path.endswith(".json3"):
        return _parse_json3(path)
    elif path.endswith(".vtt"):
        return _parse_vtt(path)
    elif path.endswith(".srt"):
        return _parse_srt(path)
    return None


def transcribe_from_video_path(video_path: str) -> Optional[str]:
    """
    High-efficiency transcription.
    Extracts audio locally to save 87% on API costs, then uses Gemini Flash-Lite.
    """
    try:
        audio_path = _extract_audio(video_path)
        audio_file = client.files.upload(file=audio_path)

        while audio_file.state.name == "PROCESSING":
            time.sleep(1)
            audio_file = client.files.get(name=audio_file.name)
        
        if audio_file.state.name == "FAILED":
            raise RuntimeError("Audio file processing failed on Google servers.")
        
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite-preview",
            contents=[
                audio_file,
                "Provide a highly accurate transcript. Output only the text."
            ],
            config=types.GenerateContentConfig(temperature=0)
        )
        if os.path.exists(audio_path):
            os.remove(audio_path) 
        return response.text.strip() or None
    except Exception as e:
        print(f"[transcription] Gemini STT failed: {e}")
        return None


def get_metadata(url: str) -> Dict:
    """
    Fetch title, description, author, duration — no video download needed.
    """
    opts = {"skip_download": True, "quiet": True, "no_warnings": True}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "title": info.get("title", ""),
                "description": info.get("description", ""),
                "uploader": info.get("uploader", ""),
                "duration": info.get("duration", 0),
            }
    except Exception as e:
        print(f"[transcription] Metadata error: {e}")
        return {}


def _extract_audio(video_path: str) -> str:
    """Extract mono 16kHz WAV from video using ffmpeg."""
    audio_path = video_path.rsplit(".", 1)[0] + "_audio.wav"
    subprocess.run(
        ["ffmpeg", "-i", video_path, "-ac", "1", "-ar", "16000", audio_path],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True,
    )
    return audio_path


def _transcribe_with_google(audio_path: str) -> Optional[str]:
    client = _get_speech_client()
    with open(audio_path, "rb") as f:
        audio_content = f.read()

    audio = speech.RecognitionAudio(content=audio_content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="en-US",
    )
    response = client.recognize(config=config, audio=audio)
    result = " ".join(r.alternatives[0].transcript for r in response.results)
    return result.strip() or None


def _parse_json3(filepath: str) -> Optional[str]:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        texts = [
            seg.get("utf8", "").strip()
            for event in data.get("events", [])
            for seg in event.get("segs", [])
        ]
        result = " ".join(t for t in texts if t and t != "\n").strip()
        return result or None
    except Exception as e:
        print(f"[transcription] json3 parse error: {e}")
        return None


def _parse_vtt(filepath: str) -> Optional[str]:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
        texts = []
        for line in lines:
            line = line.strip()
            if not line or line.startswith("WEBVTT") or line.startswith("NOTE") or "-->" in line:
                continue
            texts.append(line.replace("<c>", "").replace("</c>", ""))
        return " ".join(texts).strip() or None
    except Exception as e:
        print(f"[transcription] VTT parse error: {e}")
        return None


def _parse_srt(filepath: str) -> Optional[str]:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r"\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n", "", content)
        content = re.sub(r"\n\n+", " ", content)
        return content.strip() or None
    except Exception as e:
        print(f"[transcription] SRT parse error: {e}")
        return None