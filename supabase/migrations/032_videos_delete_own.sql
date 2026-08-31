drop policy if exists "videos_delete_own_or_admin" on public.videos;
create policy "videos_delete_own_or_admin"
  on public.videos for delete
  using (user_id = auth.uid() or public.is_admin());
