from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal, Optional
from app.ai.gemini_client import model
from app.database import get_supabase
from app.services.embeddings import retrieve_relevant_chunks

router = APIRouter()

TONE_DESCRIPTIONS = {
    "gentle": "warm, gentle, and compassionate — like a caring friend",
    "motivational": "direct, energising, and action-oriented — like a coach",
    "thoughtful": "reflective and philosophical — asking good questions",
}


def _build_system_prompt(first_name, goals, tone, relevant_chunks):
    name_str = first_name or "the user"
    tone_desc = TONE_DESCRIPTIONS.get(tone or "", "warm and supportive")
    goals_str = f"\nTheir stated goals are: {goals}." if goals else ""

    chunks_str = ""
    if relevant_chunks:
        excerpts = "\n".join(
            f'- "{c["chunk_text"][:200].strip()}"'
            for c in relevant_chunks if c.get("chunk_text")
        )
        chunks_str = f"""

RELEVANT CONTENT FROM {name_str.upper()}'S SAVED VIDEOS:
{excerpts}

When relevant, reference this content naturally — e.g. "You saved something about..." or "Based on what you've been watching...". Don't force it if not relevant."""
    else:
        chunks_str = f"{name_str} has not saved any videos yet. Do NOT reference saved content until there is saved videos."

    return f"""You are Echo, {name_str}'s personal mindset coach inside their SaveSpace app.
Your tone is {tone_desc}.{goals_str}
You may have access to content {name_str} has intentionally saved from TikTok and Instagram.{chunks_str}

Guidelines:
- Keep responses to 2-4 sentences unless they need more
- Do not directly refernece saved content - but resonate with it!!
- Use their first name occasionally
- Be specific, not generic"""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    user_id: str

class ChatResponse(BaseModel):
    reply: str
    used_rag: bool


@router.post("/", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    if not payload.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    db = get_supabase()
    profile = {}
    try:
        result = db.table("profiles").select("first_name, goals, tone_preference").eq("id", payload.user_id).execute()
        if result.data:
            profile = result.data[0]
    except Exception as e:
        print(f"Profile fetch non-fatal: {e}")

    last_user_msg = next((m.content for m in reversed(payload.messages) if m.role == "user"), "")

    relevant_chunks = []
    if last_user_msg and len(last_user_msg) > 5:
        chunks = retrieve_relevant_chunks(payload.user_id, last_user_msg, top_k=5)
        relevant_chunks = [c for c in chunks if (c.get("similarity") or 0) > 0.6]

    system_prompt = _build_system_prompt(
        profile.get("first_name"), profile.get("goals"),
        profile.get("tone_preference"), relevant_chunks
    )

    history = [
        {"role": "user", "parts": [system_prompt]},
        {"role": "model", "parts": ["Understood. Ready to chat."]},
    ]
    for msg in payload.messages[:-1]:
        history.append({"role": "user" if msg.role == "user" else "model", "parts": [msg.content]})

    try:
        response = model.start_chat(history=history).send_message(last_user_msg)
        return ChatResponse(reply=response.text.strip(), used_rag=len(relevant_chunks) > 0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")
