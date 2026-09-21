alter table public.cast_options
  add column if not exists decline_reason text;
