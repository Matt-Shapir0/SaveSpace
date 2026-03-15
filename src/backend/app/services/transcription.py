import yt_dlp
import os
import json
import glob
import tempfile
from typing import Optional, Dict

import tempfile
import subprocess
from google.cloud import speech
from google.oauth2 import service_account

from yt_dlp.utils import DownloadError

from google.cloud import speech

def get_speech_client():
    return speech.SpeechClient()

def extract_video_data(url: str) -> Dict:
    """
    Extract transcript, caption, and metadata from a video URL.
    Returns a dict with keys: transcript, caption, title, author, duration
    
    Strategy:
    1. Try to get native subtitles/auto-captions (free, fast, accurate)
    2. If none found, download audio and run Whisper (slower, costs money)
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = _download_video(url, tmpdir)
        if not video_path:
            return {
                "transcript": None,
                "caption": None,
                "title": None,
                "author": None,
                "duration": None,
            }
        transcript = _try_native_transcript(url, tmpdir)
        metadata = _get_metadata(url)
        
        if not transcript:
            print(f"No native transcript found for {url}. Falling back to Gemini.")
            audio_path = _extract_audio(video_path)
            transcript = transcribe_with_google(audio_path)
            # transcript = 'no transcript found'
        
        return {
            "transcript": transcript,
            "caption": metadata.get("description") or metadata.get("title"),
            "title": metadata.get("title"),
            "author": metadata.get("uploader"),
            "duration": metadata.get("duration"),
        }


def _try_native_transcript(url: str, tmpdir: str) -> Optional[str]:
    """
    Try to extract native subtitles or auto-generated captions.
    TikTok and YouTube both support this well.
    """
    subtitle_opts = {
        "writesubtitles": True,
        "writeautomaticsub": True,     # Get auto-generated captions too
        "subtitlesformat": "json3",    # Structured format, easier to parse
        "subtitleslangs": ["en", "en-US", "en-GB"],  # English variants
        "skip_download": True,         # Don't download the video file
        "outtmpl": f"{tmpdir}/video",
        "quiet": True,
        "no_warnings": True,
    }

    try:
        with yt_dlp.YoutubeDL(subtitle_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        print(f"yt-dlp subtitle extraction error: {e}")
        return None

    # Look for any subtitle file that was written
    subtitle_files = glob.glob(f"{tmpdir}/video*.json3") + \
                     glob.glob(f"{tmpdir}/video*.vtt") + \
                     glob.glob(f"{tmpdir}/video*.srt")

    if not subtitle_files:
        return None

    # Parse the first subtitle file found
    subtitle_file = subtitle_files[0]

    if subtitle_file.endswith(".json3"):
        return _parse_json3_subtitles(subtitle_file)
    elif subtitle_file.endswith(".vtt"):
        return _parse_vtt_subtitles(subtitle_file)
    elif subtitle_file.endswith(".srt"):
        return _parse_srt_subtitles(subtitle_file)

    return None


def _parse_json3_subtitles(filepath: str) -> Optional[str]:
    """Parse YouTube/TikTok json3 subtitle format into plain text."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        texts = []
        for event in data.get("events", []):
            for seg in event.get("segs", []):
                text = seg.get("utf8", "").strip()
                if text and text != "\n":
                    texts.append(text)
        
        return " ".join(texts).strip() or None
    except Exception as e:
        print(f"Error parsing json3 subtitles: {e}")
        return None


def _parse_vtt_subtitles(filepath: str) -> Optional[str]:
    """Parse WebVTT subtitle format into plain text."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        texts = []
        skip_next = False
        for line in lines:
            line = line.strip()
            if line.startswith("WEBVTT") or line.startswith("NOTE"):
                continue
            if "-->" in line:  # Timestamp line
                skip_next = False
                continue
            if line and not skip_next:
                # Remove HTML tags like <c> that some VTT files include
                clean = line.replace("<c>", "").replace("</c>", "")
                texts.append(clean)
        
        return " ".join(texts).strip() or None
    except Exception as e:
        print(f"Error parsing VTT subtitles: {e}")
        return None


def _parse_srt_subtitles(filepath: str) -> Optional[str]:
    """Parse SRT subtitle format into plain text."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        import re
        # Remove timestamps and sequence numbers
        content = re.sub(r'\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n', '', content)
        content = re.sub(r'\n\n+', ' ', content)
        return content.strip() or None
    except Exception as e:
        print(f"Error parsing SRT subtitles: {e}")
        return None


def _get_metadata(url: str) -> Dict:
    """Extract video metadata without downloading: title, description, author."""
    meta_opts = {
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
    }
    try:
        with yt_dlp.YoutubeDL(meta_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "title": info.get("title", ""),
                "description": info.get("description", ""),
                "uploader": info.get("uploader", ""),
                "duration": info.get("duration", 0),
            }
    except Exception as e:
        print(f"Metadata extraction error: {e}")
        return {}

def _extract_audio(video_path: str):

    audio_path = video_path.replace(".mp4", ".wav")

    subprocess.run([
        "ffmpeg",
        "-i", video_path,
        "-ac", "1",
        "-ar", "16000",
        audio_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    return audio_path

def _download_video(url, tmpdir):
    opts = {
        "format": "worst",
        "outtmpl": f"{tmpdir}/video.mp4",
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
        },
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except DownloadError as e:
        print(f"yt-dlp failed for {url}: {e}")
        return None

    return f"{tmpdir}/video.mp4"

def transcribe_with_google(audio_path: str) -> str:
    """
    Transcribe a WAV audio file using Google Speech-to-Text.
    """
    client = get_speech_client()

    with open(audio_path, "rb") as f:
        audio_content = f.read()

    audio = speech.RecognitionAudio(content=audio_content)

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="en-US",
    )

    response = client.recognize(config=config, audio=audio)

    transcript = " ".join(result.alternatives[0].transcript for result in response.results)
    return transcript.strip()