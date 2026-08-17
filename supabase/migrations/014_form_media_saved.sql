alter table public.actor_profiles
  add column if not exists form_saved_at timestamptz,
  add column if not exists media_saved_at timestamptz;
