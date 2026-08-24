-- Table exists with RLS, but authenticated had no table privileges.
grant select, insert, update, delete on public.actor_shares to authenticated;
grant select, insert, update, delete on public.actor_shares to service_role;
