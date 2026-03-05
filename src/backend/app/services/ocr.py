"""
Extract text visible in video frames using OCR.
This captures: on-screen text overlays, captions burned into the video,
text shown on whiteboards, slides, etc.

Useful for: motivational quotes displayed as text over video,
bullet points, book titles shown on screen, etc.
"""
import cv2
import pytesseract
import yt_dlp
import glob
import tempfile
import os
from typing import Optional
from PIL import Image
import numpy as np


def extract_text_from_frames(url: str, num_frames: int = 8) -> Optional[str]:
    """
    Sample N frames from a video and OCR each one.
    Returns concatenated unique text found across all frames.
    
    num_frames: how many frames to sample. More = more thorough but slower.
    8 is a good balance for a 60-second TikTok.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = _download_video(url, tmpdir)
        if not video_path:
            return None
        
        frames = _sample_frames(video_path, num_frames)
        if not frames:
            return None
        
        all_texts = []
        for frame in frames:
            text = _ocr_frame(frame)
            if text:
                all_texts.append(text)
        
        if not all_texts:
            return None
        
        # Deduplicate — many frames will have identical overlays
        unique_texts = list(dict.fromkeys(all_texts))
        return " | ".join(unique_texts)


def _download_video(url: str, tmpdir: str) -> Optional[str]:
    """Download video at lowest quality (we only need frames, not quality)."""
    video_opts = {
        "format": "worstvideo[ext=mp4]/worst[ext=mp4]/worst",  # Lowest quality
        "outtmpl": f"{tmpdir}/video.%(ext)s",
        "quiet": True,
        "no_warnings": True,
    }
    try:
        with yt_dlp.YoutubeDL(video_opts) as ydl:
            ydl.download([url])
        
        video_files = glob.glob(f"{tmpdir}/video.*")
        return video_files[0] if video_files else None
    except Exception as e:
        print(f"Video download for OCR failed: {e}")
        return None


def _sample_frames(video_path: str, num_frames: int) -> list:
    """Sample evenly-spaced frames from the video."""
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if total_frames == 0:
        cap.release()
        return []
    
    # Sample evenly across the video
    indices = [int(i * total_frames / num_frames) for i in range(num_frames)]
    frames = []
    
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            frames.append(frame)
    
    cap.release()
    return frames

def _ocr_frame(frame) -> Optional[str]:
    """
    Run OCR on a frame with preprocessing tuned for TikTok-style overlays.
    This significantly improves OCR accuracy.
    """

    # Convert BGR -> RGB
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    h, w, _ = rgb.shape

    # --- 1. Crop to likely caption region (middle-bottom of frame) ---
    # TikTok text overlays usually appear here
    cropped = rgb[int(h * 0.35):int(h * 0.9), :]

    # --- 2. Convert to grayscale ---
    gray = cv2.cvtColor(cropped, cv2.COLOR_RGB2GRAY)

    # --- 3. Upscale image (small video text becomes readable) ---
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    # --- 4. Denoise ---
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    # --- 5. Adaptive threshold (VERY important for video text) ---
    thresh = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11,
        2
    )

    # --- 6. Morphological close to connect letters ---
    kernel = np.ones((3, 3), np.uint8)
    processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    # Convert to PIL for pytesseract
    pil_image = Image.fromarray(processed)

    try:
        text = pytesseract.image_to_string(
            pil_image,
            config="--oem 3 --psm 6"
        ).strip()

        if len(text) < 5:
            return None

        text = " ".join(text.split())
        return text

    except Exception as e:
        print(f"OCR error on frame: {e}")
        return None

# def _ocr_frame(frame) -> Optional[str]:
#     """
#     Run OCR on a single frame.
#     Preprocesses for better accuracy on video text overlays.
#     """
#     # Convert from BGR (OpenCV) to RGB (PIL)
#     rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#     pil_image = Image.fromarray(rgb_frame)
    
#     # Preprocessing to improve OCR on video text:
#     # 1. Scale up (text in videos is often small)
#     width, height = pil_image.size
#     pil_image = pil_image.resize((width * 2, height * 2), Image.LANCZOS)
    
#     # 2. Convert to grayscale
#     gray = pil_image.convert("L")
    
#     # 3. Increase contrast
#     import PIL.ImageEnhance as enhance
#     gray = enhance.Contrast(gray).enhance(2.0)
    
#     # Run Tesseract OCR
#     try:
#         text = pytesseract.image_to_string(
#             gray,
#             config="--psm 3 --oem 3"  # psm 3 = auto page segmentation
#         ).strip()
        
#         # Filter out very short or noisy results
#         if len(text) < 5:
#             return None
        
#         # Remove excessive whitespace
#         text = " ".join(text.split())
#         return text
#     except Exception as e:
#         print(f"OCR error on frame: {e}")
#         return None