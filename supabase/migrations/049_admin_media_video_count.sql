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
    ), 0),
    'video_count', coalesce((
      select count(*)::int
      from public.videos v
      where v.cf_uid is not null
        and v.cf_uid <> ''
        and v.status in ('ready', 'uploading')
    ), 0)
  );
end;
$$;
