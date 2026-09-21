-- Admin web alerts: introduced actor later applies to the same cast.
create table if not exists public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'introduced_self_apply',
  title text not null,
  body text not null,
  application_id uuid references public.applications (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  cast_id uuid references public.cast_listings (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (application_id)
);

create index if not exists admin_alerts_unread_idx
  on public.admin_alerts (created_at desc)
  where read_at is null;

alter table public.admin_alerts enable row level security;

drop policy if exists "admin_alerts_read" on public.admin_alerts;
create policy "admin_alerts_read"
  on public.admin_alerts for select
  using (public.has_admin_perm('applications') or public.has_admin_perm('casts'));

drop policy if exists "admin_alerts_update" on public.admin_alerts;
create policy "admin_alerts_update"
  on public.admin_alerts for update
  using (public.has_admin_perm('applications') or public.has_admin_perm('casts'))
  with check (public.has_admin_perm('applications') or public.has_admin_perm('casts'));

grant select, update on public.admin_alerts to authenticated;
grant select, insert, update, delete on public.admin_alerts to service_role;

create or replace function public.notify_admin_introduced_apply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  project_name text;
  role_name text;
begin
  if not exists (
    select 1
    from public.cast_introductions i
    where i.cast_id = new.cast_id
      and i.actor_id = new.actor_id
  ) then
    return new;
  end if;

  select coalesce(nullif(p.full_name, ''), p.email, 'Oyuncu')
    into actor_name
  from public.profiles p
  where p.id = new.actor_id;

  select c.project_name, c.role_name
    into project_name, role_name
  from public.cast_listings c
  where c.id = new.cast_id;

  insert into public.admin_alerts (
    type,
    title,
    body,
    application_id,
    actor_id,
    cast_id
  )
  values (
    'introduced_self_apply',
    actor_name || ' tanıtıldığı ilana başvurdu',
    coalesce(project_name, 'İlan') || ' · ' || coalesce(role_name, 'Rol'),
    new.id,
    new.actor_id,
    new.cast_id
  )
  on conflict (application_id) do nothing;

  return new;
end;
$$;

drop trigger if exists applications_notify_introduced_apply on public.applications;
create trigger applications_notify_introduced_apply
  after insert on public.applications
  for each row
  execute function public.notify_admin_introduced_apply();
