from fastapi import APIRouter
from app.database import get_supabase

router = APIRouter()

@router.get("/health")
def health_check():
    """Basic health check — call this first to confirm everything is wired up."""
    try:
        db = get_supabase()
        # Try a simple DB query
        db.table("videos").select("id").limit(1).execute()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}