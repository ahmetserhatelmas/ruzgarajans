alter table public.cast_listings
  add column if not exists requires_video boolean not null default true;
