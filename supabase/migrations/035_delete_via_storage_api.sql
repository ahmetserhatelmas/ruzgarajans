-- Supabase forbids DELETE on storage.objects. Remove files with the Storage API instead.
drop policy if exists "media_delete_own_or_admin" on storage.objects;
create policy "media_delete_own_or_admin"
  on storage.objects for delete
  using (
    bucket_id in ('avatars', 'covers', 'gallery')
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

create or replace function public.admin_delete_actors(p_ids uuid[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int := 0;
begin
  if auth.uid() is null or not public.has_admin_perm('delete_accounts') then
    raise exception 'forbidden';
  end if;

  delete from auth.users u
  where u.id = any(p_ids)
    and u.id is distinct from auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = u.id
        and p.role = 'actor'
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role in ('actor', 'cast_director')
  ) then
    raise exception 'forbidden';
  end if;

  delete from auth.users where id = uid;
end;
$$;
