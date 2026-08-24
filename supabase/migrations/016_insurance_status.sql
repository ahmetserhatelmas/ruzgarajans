alter table public.actor_profiles
  add column if not exists insurance_status text,
  add column if not exists insurance_other text;
