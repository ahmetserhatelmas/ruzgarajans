alter table public.profiles
  add column if not exists is_super_admin boolean not null default false,
  add column if not exists admin_permissions text[] not null default '{}';

update public.profiles
set is_super_admin = true
where role = 'admin';

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_super_admin
  );
$$;

create or replace function public.has_admin_perm(p_perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and (
        p.is_super_admin
        or p_perm = any (p.admin_permissions)
      )
  );
$$;

create or replace function public.protect_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      if new.role = 'admin' or old.role = 'admin' then
        if not public.is_super_admin() then
          raise exception 'Admin rolünü yalnızca tam yetkili yönetici değiştirebilir.';
        end if;
      elsif new.role = 'cast_director' or old.role = 'cast_director' then
        if not public.has_admin_perm('directors') then
          raise exception 'Direktör rolünü değiştirme yetkin yok.';
        end if;
      end if;
    end if;

    if new.is_super_admin is distinct from old.is_super_admin
       or new.admin_permissions is distinct from old.admin_permissions then
      if not public.is_super_admin() then
        raise exception 'Yetkileri yalnızca tam yetkili yönetici değiştirebilir.';
      end if;
    end if;

    if old.is_super_admin and not new.is_super_admin then
      if (select count(*) from public.profiles where is_super_admin and id <> old.id) = 0 then
        raise exception 'Son tam yetkili yönetici kaldırılamaz.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_admin_fields on public.profiles;
create trigger protect_admin_fields
  before update on public.profiles
  for each row execute procedure public.protect_admin_fields();

drop policy if exists "casts_admin_write" on public.cast_listings;
create policy "casts_admin_write"
  on public.cast_listings for all
  using (public.has_admin_perm('casts'))
  with check (public.has_admin_perm('casts'));

drop policy if exists "announcements_admin_write" on public.announcements;
create policy "announcements_admin_write"
  on public.announcements for all
  using (public.has_admin_perm('announcements'))
  with check (public.has_admin_perm('announcements'));

drop policy if exists "applications_update" on public.applications;
create policy "applications_update"
  on public.applications for update
  using (actor_id = auth.uid() or public.has_admin_perm('applications'));

drop policy if exists "applications_delete_admin" on public.applications;
create policy "applications_delete_admin"
  on public.applications for delete
  using (public.has_admin_perm('applications'));

drop policy if exists "actor_shares_admin" on public.actor_shares;
create policy "actor_shares_admin"
  on public.actor_shares for all
  using (public.has_admin_perm('actors'))
  with check (public.has_admin_perm('actors'));

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.has_admin_perm(text) to authenticated;
