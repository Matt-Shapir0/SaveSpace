FROM python:3.11-slim

# Install system dependencies for yt-dlp, ffmpeg, and OCR
RUN apt-get update && apt-get install -y \
    ffmpeg \
    tesseract-ocr \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]