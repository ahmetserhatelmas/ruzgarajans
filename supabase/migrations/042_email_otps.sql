-- 6-digit email codes for signup + password reset (Resend, 15 minutes)

create table if not exists public.email_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null check (purpose in ('signup', 'reset')),
  code_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  reset_token_hash text,
  attempts int not null default 0,
  expires_at timestamptz not null,
  last_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (email, purpose)
);

create index if not exists email_otps_expires_idx on public.email_otps (expires_at);

alter table public.email_otps enable row level security;

revoke all on public.email_otps from anon, authenticated, public;
grant all on public.email_otps to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'actor')
  );
  insert into public.actor_profiles (user_id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;
