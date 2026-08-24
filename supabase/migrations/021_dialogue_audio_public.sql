update storage.buckets
set public = true
where id = 'dialogue-audio';

drop policy if exists "dialogue_audio_public_read" on storage.objects;
create policy "dialogue_audio_public_read"
  on storage.objects for select
  using (bucket_id = 'dialogue-audio');
