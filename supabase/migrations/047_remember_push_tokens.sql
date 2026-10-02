create or replace function public.remember_expo_push_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and old.expo_push_token is not null
     and old.expo_push_token is distinct from new.expo_push_token
     and length(old.expo_push_token) > 10 then
    insert into public.expo_push_tokens (token, user_id, platform, updated_at)
    values (old.expo_push_token, old.id, 'unknown', now())
    on conflict (token) do update
      set user_id = excluded.user_id,
          updated_at = now();
  end if;

  if new.expo_push_token is not null and length(new.expo_push_token) > 10 then
    insert into public.expo_push_tokens (token, user_id, platform, updated_at)
    values (new.expo_push_token, new.id, 'unknown', now())
    on conflict (token) do update
      set user_id = excluded.user_id,
          updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_remember_push_token on public.profiles;
create trigger profiles_remember_push_token
after insert or update of expo_push_token on public.profiles
for each row execute function public.remember_expo_push_token();

create or replace function public.save_push_token(p_token text, p_platform text default 'unknown')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_token is null or length(p_token) < 10 then
    return;
  end if;

  insert into public.expo_push_tokens (token, user_id, platform, updated_at)
  values (p_token, uid, coalesce(nullif(p_platform, ''), 'unknown'), now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();

  update public.profiles
     set expo_push_token = p_token
   where id = uid;
end;
$$;

revoke all on function public.save_push_token(text, text) from public;
grant execute on function public.save_push_token(text, text) to authenticated, service_role;

grant all on table public.expo_push_tokens to postgres, anon, authenticated, service_role;
