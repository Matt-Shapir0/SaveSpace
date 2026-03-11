from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_supabase

router = APIRouter()


class ProfileCreate(BaseModel):
    id: str
    goals: Optional[list[str]] = []
    interests: Optional[list[str]] = []
    tone_preference: Optional[str] = None


@router.post("/")
def create_or_update_profile(payload: ProfileCreate):
    db = get_supabase()
    result = db.table("profiles").upsert({
        "id": payload.id,
        "goals": ",".join(payload.goals) if payload.goals else None,
        "goals_array": payload.goals,
        "interests_array": payload.interests,
        "tone_preference": payload.tone_preference,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save profile")

    return result.data[0]


@router.get("/{user_id}")
def get_profile(user_id: str):
    db = get_supabase()
    result = db.table("profiles").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data[0]
