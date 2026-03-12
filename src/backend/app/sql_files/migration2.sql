-- 1. Add first_name to profiles
alter table public.profiles
  add column if not exists first_name text;

-- 2. Ensure the chunks table has the right shape for RAG
-- (pgvector extension must already be enabled from Migration 1)
create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references public.videos(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  chunk_text text not null,
  embedding vector(768),   -- Gemini text-embedding-004 outputs 768 dims
  created_at timestamptz default now()
);

-- 3. Index for fast cosine similarity search
create index if not exists chunks_embedding_idx
  on public.chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- 4. RLS
alter table public.chunks enable row level security;

drop policy if exists "Users see own chunks" on public.chunks;
create policy "Users manage own chunks" on public.chunks
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Helper function — called from backend to do similarity search
-- Returns the top K chunks for a user given a query embedding
create or replace function match_chunks(
  query_embedding vector(768),
  match_user_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  chunk_text text,
  video_id uuid,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.chunk_text,
    c.video_id,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  where c.user_id = match_user_id
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
