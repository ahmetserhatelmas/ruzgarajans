-- Actors can permanently delete their own account (auth + cascaded profile rows).
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

  delete from storage.objects
  where bucket_id in ('avatars', 'covers', 'gallery')
    and name like uid::text || '/%';

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
