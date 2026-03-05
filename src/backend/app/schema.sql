-- Enable pgvector extension for embeddings later
create extension if not exists vector;

-- Users table (Supabase Auth handles auth, this stores preferences)
create table public.profiles (
  id uuid references auth.users(id) primary key,
  goals text,
  tone_preference text,
  created_at timestamptz default now()
);

-- Videos table — one row per shared video
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  url text not null,
  source text,                    -- 'tiktok', 'instagram', 'youtube', etc.
  status text default 'pending',  -- pending | processing | done | failed
  transcript text,                -- native transcript if available
  caption text,                   -- video caption/description
  ocr_text text,                  -- text extracted from video frames
  full_text text,                 -- combined transcript + caption + ocr
  error_message text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

-- Chunks table — transcript split into chunks for vector search
create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references public.videos(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536),          -- OpenAI text-embedding-3-small dimension
  theme_tags text[],
  created_at timestamptz default now()
);

-- Create vector similarity search index
create index on public.chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Row Level Security — users can only see their own data
alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.chunks enable row level security;

create policy "Users see own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "Users see own videos" on public.videos
  for all using (auth.uid() = user_id);

create policy "Users see own chunks" on public.chunks
  for all using (auth.uid() = user_id);