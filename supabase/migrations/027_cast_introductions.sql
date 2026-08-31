create table if not exists public.cast_introductions (
  id uuid primary key default gen_random_uuid(),
  cast_id uuid not null references public.cast_listings (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (cast_id, actor_id)
);

create index if not exists cast_introductions_actor_idx on public.cast_introductions (actor_id);
create index if not exists cast_introductions_cast_idx on public.cast_introductions (cast_id);

alter table public.cast_introductions enable row level security;

drop policy if exists "cast_introductions_admin" on public.cast_introductions;
create policy "cast_introductions_admin"
  on public.cast_introductions for all
  using (public.has_admin_perm('casts') or public.has_admin_perm('actors'))
  with check (public.has_admin_perm('casts') or public.has_admin_perm('actors'));

drop policy if exists "cast_introductions_actor_read" on public.cast_introductions;
create policy "cast_introductions_actor_read"
  on public.cast_introductions for select
  using (actor_id = auth.uid());

grant select, insert, update, delete on public.cast_introductions to authenticated;
grant select, insert, update, delete on public.cast_introductions to service_role;
