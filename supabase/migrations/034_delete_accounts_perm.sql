-- Account deletion is a separate admin permission (bulk + single actor delete).
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

  delete from storage.objects o
  where o.bucket_id in ('avatars', 'covers', 'gallery')
    and exists (
      select 1
      from unnest(p_ids) as id
      where o.name like id::text || '/%'
    );

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

revoke all on function public.admin_delete_actors(uuid[]) from public;
grant execute on function public.admin_delete_actors(uuid[]) to authenticated;
