create table if not exists public.expo_push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null default 'unknown',
  updated_at timestamptz not null default now()
);

create index if not exists expo_push_tokens_user_id_idx
  on public.expo_push_tokens (user_id);

alter table public.expo_push_tokens enable row level security;

drop policy if exists expo_push_tokens_own on public.expo_push_tokens;
create policy expo_push_tokens_own
  on public.expo_push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.expo_push_tokens (token, user_id, platform)
select expo_push_token, id, 'unknown'
from public.profiles
where expo_push_token is not null
  and length(expo_push_token) > 10
on conflict (token) do nothing;

grant all on table public.expo_push_tokens to postgres, anon, authenticated, service_role;
