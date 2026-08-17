alter table public.cast_listings
  add column if not exists nationalities text[] not null default '{}',
  add column if not exists languages text[] not null default '{}';
