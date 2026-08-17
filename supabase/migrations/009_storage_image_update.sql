-- Allow actors to replace their own avatar / cover / gallery files (upsert)
drop policy if exists "avatar_update_own" on storage.objects;
create policy "avatar_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "cover_update_own" on storage.objects;
create policy "cover_update_own"
  on storage.objects for update
  using (
    bucket_id = 'covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "gallery_update_own" on storage.objects;
create policy "gallery_update_own"
  on storage.objects for update
  using (
    bucket_id = 'gallery'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'gallery'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
