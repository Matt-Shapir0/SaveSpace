from google import genai
from app.config import settings
from app.database import get_supabase
from typing import Optional

client = genai.Client(api_key=settings.google_api_key)

EMBED_MODEL = "gemini-embedding-001"

CHUNK_SIZE = 200
CHUNK_OVERLAP = 50


def embed_text(text: str) -> Optional[list[float]]:
    """
    Embed stored document chunks.
    """
    try:
        result = client.models.embed_content(model=EMBED_MODEL, contents=text)
        return result.embeddings[0].values
    except Exception as e:
        print(f"Embedding failed: {e}")
        return None


def embed_query(text: str) -> Optional[list[float]]:
    """
    Embed a user's query for similarity search.
    """
    try:
        result = client.models.embed_content(model=EMBED_MODEL,contents=text)
        return result.embeddings[0].values
    except Exception as e:
        print(f"Query embedding failed: {e}")
        return None


def _chunk_text(text: str) -> list[str]:
    """
    Split text into overlapping chunks.
    """
    if len(text) <= CHUNK_SIZE:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end]
        last_period = chunk.rfind(". ")
        if last_period > CHUNK_SIZE // 2:
            chunk = chunk[: last_period + 1]
        chunks.append(chunk.strip())
        start += len(chunk) - CHUNK_OVERLAP

    return [c for c in chunks if len(c) > 20]


def embed_and_store_video(video_id: str, user_id: str, full_text: str) -> int:
    """
    Chunk text, embed, and store in Supabase.
    """
    if not full_text or len(full_text.strip()) < 30:
        print(f"[{video_id}] Text too short to embed.")
        return 0

    db = get_supabase()
    chunks = _chunk_text(full_text)
    stored = 0
    db.table("chunks").delete().eq("video_id", video_id).execute()
    for chunk_text in chunks:
        vector = embed_text(chunk_text)
        if vector is None:
            continue
        db.table("chunks").insert({
            "video_id": video_id,
            "user_id": user_id,
            "chunk_text": chunk_text,
            "embedding": vector
        }).execute()
        stored += 1

    print(f"[{video_id}] Stored {stored} embedded chunks.")
    return stored


def retrieve_relevant_chunks(user_id: str, query: str, top_k: int = 5) -> list[dict]:
    """
    Retrieve semantically similar chunks via pgvector RPC.
    """
    query_vector = embed_query(query)
    if query_vector is None:
        return []
    db = get_supabase()
    try:
        result = db.rpc("match_chunks",
            {
                "query_embedding": query_vector,
                "match_user_id": user_id,
                "match_count": top_k
            }
        ).execute()
        return result.data or []
    except Exception as e:
        print(f"Chunk retrieval failed: {e}")
        return []