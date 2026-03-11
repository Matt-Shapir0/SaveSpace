-- 1. Add theme_tags column to videos (stores extracted themes per video)
alter table public.videos
  add column if not exists theme_tags text[] default '{}';

-- 2. Fix profiles table — store goals/interests as arrays, not comma strings
alter table public.profiles
  add column if not exists goals_array text[] default '{}',
  add column if not exists interests_array text[] default '{}';

-- 3. Create a themes_weekly table for Insights chart data
-- Each row = one user's theme count for one ISO week
create table if not exists public.themes_weekly (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  week_label text not null,      -- e.g. "Week 1", "Week 2" relative to signup
  week_start date not null,
  theme_id text not null,        -- e.g. "growth", "motivation"
  count integer default 0,
  updated_at timestamptz default now(),
  unique(user_id, week_start, theme_id)
);

-- 4. RLS for new table
alter table public.themes_weekly enable row level security;

create policy "Users see own theme data" on public.themes_weekly
  for all using (auth.uid() = user_id);

-- 5. Relax profiles RLS so newly created auth users can insert their own profile
-- (The old policy was too strict for signup flow)
drop policy if exists "Users see own profile" on public.profiles;

create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

-- 6. Relax videos RLS similarly
drop policy if exists "Users see own videos" on public.videos;

create policy "Users manage own videos" on public.videos
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
