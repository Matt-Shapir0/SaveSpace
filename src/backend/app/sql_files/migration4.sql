alter table public.videos
  add column if not exists title text,
  add column if not exists author text,
  add column if not exists thumbnail_url text;
