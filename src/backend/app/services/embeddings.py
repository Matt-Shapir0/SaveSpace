"""
Generates text embeddings using Gemini text-embedding-004.
Stores them in the chunks table for RAG retrieval.

Gemini embedding model outputs 768-dimensional vectors.
Chunk long transcripts so each chunk fits comfortably in context.
"""
import google.generativeai as genai
from app.config import settings
from app.database import get_supabase
from typing import Optional

genai.configure(api_key=settings.google_api_key)

CHUNK_SIZE = 400      # characters per chunk (roughly 80-100 words)
CHUNK_OVERLAP = 80   # overlap so context isn't lost at boundaries


def embed_text(text: str) -> Optional[list[float]]:
    """
    Call Gemini embedding API and return the vector.
    Returns None on failure so the caller can handle gracefully.
    """
    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document",  # optimised for stored docs
        )
        return result["embedding"]
    except Exception as e:
        print(f"Embedding failed: {e}")
        return None


def embed_query(text: str) -> Optional[list[float]]:
    """
    Embed a user's chat message for similarity search.
    Uses task_type="retrieval_query" (slightly different optimisation).
    """
    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_query",
        )
        return result["embedding"]
    except Exception as e:
        print(f"Query embedding failed: {e}")
        return None


def _chunk_text(text: str) -> list[str]:
    """
    Split text into overlapping chunks.
    Simple character-based chunking — good enough for transcript text.
    """
    if len(text) <= CHUNK_SIZE:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end]
        # Try to break at a sentence boundary
        last_period = chunk.rfind(". ")
        if last_period > CHUNK_SIZE // 2:
            chunk = chunk[: last_period + 1]
        chunks.append(chunk.strip())
        start += len(chunk) - CHUNK_OVERLAP
    return [c for c in chunks if len(c) > 20]  # skip tiny fragments


def embed_and_store_video(video_id: str, user_id: str, full_text: str) -> int:
    """
    Chunk a video's full_text, embed each chunk, and store in DB.
    Returns the number of chunks stored.
    Called by video_processor after a video is successfully processed.
    """
    if not full_text or len(full_text.strip()) < 30:
        print(f"[{video_id}] Text too short to embed, skipping.")
        return 0

    db = get_supabase()
    chunks = _chunk_text(full_text)
    stored = 0

    # Delete any existing chunks for this video (re-processing case)
    db.table("chunks").delete().eq("video_id", video_id).execute()

    for chunk_text in chunks:
        vector = embed_text(chunk_text)
        if vector is None:
            continue

        db.table("chunks").insert({
            "video_id": video_id,
            "user_id": user_id,
            "chunk_text": chunk_text,
            "embedding": vector,
        }).execute()
        stored += 1

    print(f"[{video_id}] Stored {stored} embedded chunks.")
    return stored


def retrieve_relevant_chunks(
    user_id: str,
    query: str,
    top_k: int = 5,
) -> list[dict]:
    """
    Find the most semantically similar chunks from a user's library.
    Used by the chat router to build RAG context.
    Returns list of dicts with chunk_text and similarity score.
    """
    query_vector = embed_query(query)
    if query_vector is None:
        return []

    db = get_supabase()
    try:
        result = db.rpc("match_chunks", {
            "query_embedding": query_vector,
            "match_user_id": user_id,
            "match_count": top_k,
        }).execute()
        return result.data or []
    except Exception as e:
        print(f"Chunk retrieval failed: {e}")
        return []
