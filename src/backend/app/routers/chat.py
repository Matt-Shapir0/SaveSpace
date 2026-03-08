# Simple Gemini chat endpoint.
# Receives a conversation history from the frontend and returns the next reply.
# No RAG yet — plain LLM conversation. We'll add saved-content context later.

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
from app.ai.gemini_client import get_gemini_client

router = APIRouter()

SYSTEM_PROMPT = """You are a warm, emotionally intelligent personal coach named Echo.
You help users reflect on their mindset, celebrate wins, work through doubts, and stay motivated.
Keep responses concise (2-4 sentences), conversational, and supportive.
You reference personal growth, resilience, and self-compassion when relevant.
Do NOT give generic life advice — be specific and grounded in what the user actually says."""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    user_id: str


class ChatResponse(BaseModel):
    reply: str


@router.post("/", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    """
    Send a conversation history to Gemini and return the next assistant reply.
    The frontend sends the full message history on every call.
    """
    if not payload.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    client = get_gemini_client()
    model = client

    # Build the prompt Gemini expects.
    # Gemini's chat API takes a list of Content objects with role/parts.
    # We prepend a system instruction and then pass the conversation.
    try:
        history = []
        for msg in payload.messages[:-1]:  # all messages except the last
            history.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [msg.content],
            })

        last_message = payload.messages[-1].content
        chat_session = model.start_chat(history=history)
        response = chat_session.send_message(
            f"[System: {SYSTEM_PROMPT}]\n\n{last_message}" if not history else last_message
        )

        response = chat_session.send_message(last_message)
        reply = response.text.strip()

        return ChatResponse(reply=reply)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")
