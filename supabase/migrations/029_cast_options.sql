create table if not exists public.cast_options (
  id uuid primary key default gen_random_uuid(),
  cast_id uuid not null references public.cast_listings (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cast_id, actor_id)
);

create index if not exists cast_options_actor_idx on public.cast_options (actor_id);
create index if not exists cast_options_cast_idx on public.cast_options (cast_id);

alter table public.cast_options enable row level security;

drop policy if exists "cast_options_admin" on public.cast_options;
create policy "cast_options_admin"
  on public.cast_options for all
  using (public.has_admin_perm('casts') or public.has_admin_perm('actors'))
  with check (public.has_admin_perm('casts') or public.has_admin_perm('actors'));

drop policy if exists "cast_options_actor_read" on public.cast_options;
create policy "cast_options_actor_read"
  on public.cast_options for select
  using (actor_id = auth.uid());

drop policy if exists "cast_options_actor_respond" on public.cast_options;
create policy "cast_options_actor_respond"
  on public.cast_options for update
  using (actor_id = auth.uid())
  with check (actor_id = auth.uid());

grant select, insert, update, delete on public.cast_options to authenticated;
grant select, insert, update, delete on public.cast_options to service_role;
