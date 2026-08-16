-- Manuel admin onayı: yeni oyuncular pending başlar
alter table public.profiles
  alter column actor_status set default 'pending';

-- Cast ilanları yalnızca onaylı oyunculara (veya admin)
drop policy if exists "casts_select" on public.cast_listings;
create policy "casts_select"
  on public.cast_listings for select
  using (
    public.is_admin()
    or (is_published = true and public.is_approved_actor())
  );

-- Oyuncu kendini onaylayamaz / reddedemez
create or replace function public.guard_actor_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actor_status is distinct from old.actor_status
     and not public.is_admin() then
    if new.actor_status in ('approved', 'rejected') then
      raise exception 'Only admins can approve or reject actors';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_actor_status on public.profiles;
create trigger profiles_guard_actor_status
  before update on public.profiles
  for each row
  execute function public.guard_actor_status_change();
