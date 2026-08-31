create table if not exists public.application_shares (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  application_ids uuid[] not null default '{}',
  token text not null unique,
  created_by uuid not null references public.profiles (id),
  recipient_id uuid references public.profiles (id) on delete set null,
  note text,
  pin_hash text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

update public.application_shares
set application_ids = array[application_id]
where coalesce(cardinality(application_ids), 0) = 0
  and application_id is not null;

create index if not exists application_shares_app_idx
  on public.application_shares (application_id);
create index if not exists application_shares_app_ids_gin
  on public.application_shares using gin (application_ids);
create index if not exists application_shares_recipient_idx
  on public.application_shares (recipient_id);

alter table public.application_shares enable row level security;

drop policy if exists "application_shares_admin" on public.application_shares;
create policy "application_shares_admin"
  on public.application_shares for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "application_shares_director_read" on public.application_shares;
create policy "application_shares_director_read"
  on public.application_shares for select
  using (
    recipient_id = auth.uid()
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  );

grant select, insert, update, delete on public.application_shares to authenticated;
grant select, insert, update, delete on public.application_shares to service_role;

create or replace function public.application_share_item(p_application_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when a.id is null then null
      else coalesce(public.actor_share_item(a.actor_id), '{}'::jsonb) || jsonb_build_object(
        'application', jsonb_build_object(
          'id', a.id,
          'status', a.status,
          'accept_budget', a.accept_budget,
          'counter_budget', a.counter_budget,
          'note', a.note,
          'created_at', a.created_at
        ),
        'listing', (
          select jsonb_build_object(
            'id', c.id,
            'project_name', c.project_name,
            'role_name', c.role_name,
            'role_description', c.role_description,
            'deadline', c.deadline,
            'option_date', c.option_date,
            'budget_amount', c.budget_amount,
            'budget_currency', c.budget_currency
          )
          from public.cast_listings c
          where c.id = a.cast_id
        ),
        'auditions', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', v.id,
              'playback_url', v.playback_url,
              'title', v.title
            )
          )
          from public.videos v
          where v.kind = 'audition'
            and v.playback_url is not null
            and (
              v.application_id = a.id
              or (v.cast_id = a.cast_id and v.user_id = a.actor_id)
            )
        ), '[]'::jsonb)
      )
    end
  from public.applications a
  where a.id = p_application_id;
$$;

revoke all on function public.application_share_item(uuid) from public;

drop function if exists public.open_application_share(text);
drop function if exists public.open_application_share(text, text);

create or replace function public.open_application_share(p_token text, p_pin text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  s public.application_shares;
  ids uuid[];
  aid uuid;
  items jsonb := '[]'::jsonb;
  item jsonb;
  given_hash text;
begin
  if p_token is null or length(p_token) < 16 then
    return jsonb_build_object('error', 'unavailable');
  end if;

  select * into s
  from public.application_shares
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if not found then
    return jsonb_build_object('error', 'unavailable');
  end if;

  if s.pin_hash is null then
    return jsonb_build_object('error', 'unavailable');
  end if;

  if p_pin is null or p_pin !~ '^\d{4}$' then
    return jsonb_build_object('error', 'pin_required');
  end if;

  given_hash := encode(digest(convert_to('ruzgar-share-pin:' || p_pin, 'UTF8'), 'sha256'), 'hex');
  if given_hash is distinct from s.pin_hash then
    return jsonb_build_object('error', 'bad_pin');
  end if;

  ids := coalesce(nullif(s.application_ids, '{}'), array[s.application_id]);

  foreach aid in array ids
  loop
    item := public.application_share_item(aid);
    if item is not null
      and item -> 'application' is not null
      and item -> 'application' != 'null'::jsonb
    then
      items := items || jsonb_build_array(item);
    end if;
  end loop;

  if jsonb_array_length(items) = 0 then
    return jsonb_build_object('error', 'unavailable');
  end if;

  return jsonb_build_object('items', items);
end;
$$;

revoke all on function public.open_application_share(text, text) from public;
grant execute on function public.open_application_share(text, text) to anon, authenticated;
