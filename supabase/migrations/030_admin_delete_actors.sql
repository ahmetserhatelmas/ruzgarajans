-- Admin can permanently delete actor accounts (auth + cascaded profile rows).
create or replace function public.admin_delete_actors(p_ids uuid[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int := 0;
begin
  if auth.uid() is null or not public.has_admin_perm('actors') then
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

revoke all on function public.admin_delete_actors(uuid[]) from public;
grant execute on function public.admin_delete_actors(uuid[]) to authenticated;
