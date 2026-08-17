-- Oyuncu mesajları: yalnızca onaylı actor veya admin yazabilir
drop policy if exists "conversations_insert_actor" on public.conversations;
create policy "conversations_insert_actor"
  on public.conversations for insert
  with check (
    public.is_admin()
    or (actor_id = auth.uid() and public.is_approved_actor())
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          public.is_admin()
          or (c.actor_id = auth.uid() and public.is_approved_actor())
        )
    )
  );
