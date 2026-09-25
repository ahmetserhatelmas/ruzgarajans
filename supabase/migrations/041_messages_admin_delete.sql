drop policy if exists "conversations_admin_delete" on public.conversations;
create policy "conversations_admin_delete"
  on public.conversations for delete
  using (public.is_admin());

drop policy if exists "messages_admin_delete" on public.messages;
create policy "messages_admin_delete"
  on public.messages for delete
  using (public.is_admin());
