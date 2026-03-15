from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
from app.ai.gemini_client import client
from app.database import get_supabase
from app.services.embeddings import retrieve_relevant_chunks

router = APIRouter()

MODEL_NAME = "gemini-2.5-flash"

TONE_DESCRIPTIONS = {
    "gentle": "warm, gentle, and compassionate — like a caring friend",
    "motivational": "direct, energising, and action-oriented — like a coach",
    "thoughtful": "reflective and philosophical — asking good questions",
}

def build_prompt(messages, system_prompt):
    history = ""

    for m in messages:
        role = m.role
        content = m.content
        if role == "user":
            history += f"User: {content}\n"
        else:
            history += f"Assistant: {content}\n"

    prompt = f"""
{system_prompt}

Conversation so far:

{history}

Assistant:
"""
    return prompt

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

Use the themes and ideas from saved content naturally without mentioning the videos directly.
"""
    else:
        chunks_str = f"{name_str} has not saved any videos yet."

    return f"""You are Echo, {name_str}'s personal mindset coach inside their SaveSpace app.
Your tone is {tone_desc}.{goals_str}
You may have access to content {name_str} has intentionally saved from TikTok and Instagram.
{chunks_str}

Guidelines:
- Keep responses to 2–4 sentences unless needed
- Use their first name occasionally
- Be specific, not generic
"""

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
        result = (
            db.table("profiles")
            .select("first_name, goals, tone_preference")
            .eq("id", payload.user_id)
            .execute()
        )
        if result.data:
            profile = result.data[0]
    except Exception as e:
        print(f"Profile fetch non-fatal: {e}")

    last_user_msg = next((m.content for m in reversed(payload.messages) if m.role == "user"),"")

    relevant_chunks = []
    if last_user_msg and len(last_user_msg) > 5:
        chunks = retrieve_relevant_chunks(payload.user_id, last_user_msg, top_k=5)
        relevant_chunks = [c for c in chunks if (c.get("similarity") or 0) > 0.6]
    print("Retrieved chunks:", len(relevant_chunks))

    system_prompt = _build_system_prompt(
        profile.get("first_name"),
        profile.get("goals"),
        profile.get("tone_preference"),
        relevant_chunks,
    )

    prompt = build_prompt(payload.messages, system_prompt)


    # Build conversation history
    # contents = []
    # contents.append({"role": "user", "parts": [system_prompt]})
    # contents.append({"role": "model","parts": ["Understood. Ready to chat."]})

    # for msg in payload.messages:
    #     contents.append({
    #         "role": "user" if msg.role == "user" else "model",
    #         "parts": [msg.content]
    #     })

    try:
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        reply = response.text.strip()
        return ChatResponse(reply=reply, used_rag=len(relevant_chunks) > 0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")