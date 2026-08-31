-- Üyelik onayı ayrı yetki: yalnızca actor_approvals (veya tam yetki) onaylar / reddeder
create or replace function public.guard_actor_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actor_status is distinct from old.actor_status
     and new.actor_status in ('approved', 'rejected')
     and not public.has_admin_perm('actor_approvals') then
    raise exception 'Üyelik onaylama yetkin yok.';
  end if;
  return new;
end;
$$;
