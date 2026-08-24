alter table public.cast_listings
  add column if not exists option_date date,
  add column if not exists payment_due_date date;
