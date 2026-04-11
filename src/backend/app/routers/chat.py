"""
RAG-backed chat with Echo, the user's personal mindset coach.

Key design decisions:
- RAG retrieval runs on the first 2 user messages.
- Uses Gemini's native multi-turn contents format instead of a flat string prompt.
- System prompt is opinionated and bans generic AI filler phrases explicitly.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal

from app.ai.gemini_client import client
from app.database import get_supabase
from app.services.embeddings import retrieve_relevant_chunks

router = APIRouter()
MODEL_NAME = "gemini-2.5-flash"

TONE_INSTRUCTIONS = {
    "gentle": (
        "You speak softly and without pressure. You sit with the person rather than pushing them. "
        "You acknowledge difficulty before offering any reframe."
    ),
    "motivational": (
        "You are direct and don't sugarcoat. You challenge the person when they're making excuses. "
        "Short sentences. Energy. No hand-wringing."
    ),
    "thoughtful": (
        "You ask more than you tell. You reflect ideas back as questions. "
        "You're comfortable with uncertainty and complexity."
    ),
}

DEFAULT_TONE = "You are warm but direct. You don't over-explain. You trust the person to handle honest feedback."

BANNED_PHRASES = [
    "you've got this", "that's a great question", "absolutely", "certainly",
    "of course", "it's important to remember", "remember that", "don't forget",
    "at the end of the day", "you are enough", "be kind to yourself",
    "on your journey", "it's okay to", "it's normal to feel",
    "I'm here to support you", "I'm here to help",
    "as your mindset coach", "as Echo",
]

def _count_user_messages(messages: list) -> int:
    return sum(1 for m in messages if m.role == "user")

def _should_retrieve_rag(messages: list) -> bool:
    return _count_user_messages(messages) <= 2


def _build_system_prompt(first_name, goals, tone, relevant_chunks) -> str:
    name = first_name or "there"
    tone_instruction = TONE_INSTRUCTIONS.get(tone or "", DEFAULT_TONE)
    goals_str = f"Their stated goals: {goals}." if goals else ""
    banned = ", ".join(f'"{p}"' for p in BANNED_PHRASES)

    if relevant_chunks:
        excerpts = "\n".join(
            f'- "{c["chunk_text"][:250].strip()}"'
            for c in relevant_chunks
            if c.get("chunk_text")
        )
        rag_block = f"""
CONTENT {name.upper()} HAS BEEN SAVING LATELY:
{excerpts}

These are ideas they've been saving. Let them shape your perspective on what \
they're going listening to — but never say "based on your saved videos" or reference \
the videos directly. If something they saved is clearly relevant to what they're \
asking, you can reference the idea itself as if it's part of the conversation.
"""
    else:
        rag_block = (
            f"{name} hasn't saved any content yet. Respond from what they tell you directly."
        )

    return f"""You are Echo — {name}'s personal mindset coach inside their app.

TONE: {tone_instruction}
{goals_str}

{rag_block}

RULES:
- Responses are 2–3 sentences max unless they asked something that genuinely needs more.
- End with either a direct observation OR one specific question. Never both. Never neither.
- Use {name}'s name at most once per response - not always tho.
- Be specific to what they actually said. Do not give advice that could apply to anyone.
- If they're venting, acknowledge what they said before doing anything else.
- If they ask for tactical advice, give a concrete action — not a mindset reframe.
- NEVER use these phrases or anything like them: {banned}
- Do not use affirmations or hype. Do not tell them they're doing great unless they asked.
- You have a point of view. It is okay to respectfully disagree or push back.
- No bullet points. No lists. Just talk to them.
"""


def _build_contents(messages: list, system_prompt: str) -> list:
    """
    Build Gemini's native multi-turn contents list.
    """
    return [
        {"role": "user" if m.role == "user" else "model", 
         "parts": [{"text": m.content}]}
        for m in messages
    ]


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
            db.table("profiles").select("first_name, goals, tone_preference")
            .eq("id", payload.user_id).execute()
        )
        if result.data:
            profile = result.data[0]
    except Exception as e:
        print(f"[chat] Profile fetch non-fatal: {e}")

    relevant_chunks = []
    if _should_retrieve_rag(payload.messages):
        last_user_msg = next(
            (m.content for m in reversed(payload.messages) if m.role == "user"), ""
        )
        if last_user_msg and len(last_user_msg) > 5:
            try:
                chunks = retrieve_relevant_chunks(payload.user_id, last_user_msg, top_k=4)
                relevant_chunks = chunks
                relevant_chunks = [c for c in chunks if (c.get("similarity") or 0) > 0.5]
            except Exception as e:
                print(f"[chat] RAG retrieval non-fatal: {e}")

    print(f"[chat] user_msgs={_count_user_messages(payload.messages)} rag={len(relevant_chunks)}")

    system_prompt = _build_system_prompt(
        profile.get("first_name"),
        profile.get("goals"),
        profile.get("tone_preference"),
        relevant_chunks,
    )

    contents = _build_contents(payload.messages, system_prompt)

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config={
                "temperature": 0.85,
                "max_output_tokens": 300,
                "system_instruction": system_prompt,
            },
        )
        reply = response.text.strip()
        return ChatResponse(reply=reply, used_rag=len(relevant_chunks) > 0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")