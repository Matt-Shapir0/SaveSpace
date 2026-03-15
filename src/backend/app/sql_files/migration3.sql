-- 1. Episodes table
create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,

  -- Content
  title text not null,
  script text,                    -- full generated script text
  segments jsonb default '[]',    -- [{text, start_time, end_time}] for karaoke
  themes text[] default '{}',

  -- Audio
  audio_url text,                 -- Supabase Storage public URL
  audio_duration integer,         -- seconds

  -- Source videos that contributed
  video_ids uuid[] default '{}',

  -- Generation state
  status text default 'generating' check (status in ('generating', 'done', 'failed')),
  error_message text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Index for fast user lookup, newest first
create index if not exists episodes_user_created_idx
  on public.episodes (user_id, created_at desc);

-- 3. RLS
alter table public.episodes enable row level security;

create policy "Users manage own episodes" on public.episodes
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Supabase Storage bucket setup
-- NOTE: After running this SQL, go to:
-- Supabase Dashboard → Storage → New Bucket
-- Name: "episodes"
-- Public: YES (so audio URLs work without auth tokens)
-- Or run this via the Supabase client in your backend (done automatically on first generate).
