from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_supabase

router = APIRouter()

class ProfileCreate(BaseModel):
    id: str                          # user UUID (from localStorage for now)
    goals: Optional[str] = None      # comma-separated goal IDs
    tone_preference: Optional[str] = None


@router.post("/")
def create_or_update_profile(payload: ProfileCreate):
    """
    Upsert a user profile. Called at the end of onboarding.
    Uses upsert so re-running onboarding updates rather than errors.
    """
    db = get_supabase()
    result = db.table("profiles").upsert({
        "id": payload.id,
        "goals": payload.goals,
        "tone_preference": payload.tone_preference,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save profile")

    return result.data[0]
