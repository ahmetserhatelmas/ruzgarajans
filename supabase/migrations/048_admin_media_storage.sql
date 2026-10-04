-- Photo bytes live in Storage metadata. One hop for the admin summary.
create or replace function public.admin_media_storage()
returns json
language plpgsql
stable
security definer
set search_path = public, storage
as $$
begin
  if auth.uid() is not null
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'admin'
     ) then
    raise exception 'forbidden';
  end if;

  return json_build_object(
    'bytes', coalesce((
      select sum(
        case
          when (o.metadata->>'size') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint
          else 0
        end
      )
      from storage.objects o
      where o.bucket_id in ('avatars', 'covers', 'gallery')
    ), 0),
    'count', coalesce((
      select count(*)::int
      from storage.objects o
      where o.bucket_id in ('avatars', 'covers', 'gallery')
    ), 0)
  );
end;
$$;

revoke all on function public.admin_media_storage() from public;
grant execute on function public.admin_media_storage() to authenticated;
grant execute on function public.admin_media_storage() to service_role;
