alter table public.actor_profiles
  add column if not exists is_turkish_citizen boolean;
