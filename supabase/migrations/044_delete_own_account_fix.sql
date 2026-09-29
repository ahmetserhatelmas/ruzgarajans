-- Self-serve account delete without Vercel. Run in Supabase SQL Editor.
-- Reassigns non-cascade created_by rows, then removes auth.users (profiles cascade).

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  fallback uuid;
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

  select p.id
    into fallback
    from public.profiles p
   where p.id is distinct from uid
     and p.role = 'admin'
   limit 1;

  if fallback is null then
    select p.id
      into fallback
      from public.profiles p
     where p.id is distinct from uid
     limit 1;
  end if;

  if fallback is not null then
    update public.cast_listings set created_by = fallback where created_by = uid;
    update public.announcements set created_by = fallback where created_by = uid;
    update public.share_links set created_by = fallback where created_by = uid;
    update public.cast_introductions set created_by = fallback where created_by = uid;
    update public.actor_shares set created_by = fallback where created_by = uid;
    update public.cast_options set created_by = fallback where created_by = uid;
    update public.application_shares set created_by = fallback where created_by = uid;
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
