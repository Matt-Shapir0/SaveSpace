from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class VideoCreate(BaseModel):
    url: str
    user_id: str  # Will come from auth token prob later

class VideoResponse(BaseModel):
    id: str
    url: str
    status: str
    source: Optional[str] = None
    title: Optional[str] = None
    author: Optional[str] = None
    thumbnail_url: Optional[str] = None
    transcript: Optional[str] = None
    caption: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None

class ProcessingStatus(BaseModel):
    video_id: str
    status: str
    message: str
