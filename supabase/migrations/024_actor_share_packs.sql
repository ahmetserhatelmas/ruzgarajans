alter table public.actor_shares
  add column if not exists actor_ids uuid[] not null default '{}';

update public.actor_shares
set actor_ids = array[actor_id]
where coalesce(cardinality(actor_ids), 0) = 0
  and actor_id is not null;

create index if not exists actor_shares_actor_ids_gin
  on public.actor_shares using gin (actor_ids);

create or replace function public.director_can_view(p_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.actor_shares s
    where s.recipient_id = auth.uid()
      and s.revoked_at is null
      and (s.expires_at is null or s.expires_at > now())
      and (
        s.actor_id = p_actor_id
        or p_actor_id = any(coalesce(s.actor_ids, array[]::uuid[]))
      )
  );
$$;

create or replace function public.actor_share_item(p_actor_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'email', p.email,
        'phone', p.phone,
        'avatar_url', p.avatar_url,
        'cover_url', p.cover_url
      )
      from public.profiles p
      where p.id = p_actor_id
    ),
    'actor', (
      select to_jsonb(a)
        - 'iban'
        - 'bank_name'
        - 'bank_account_name'
        - 'kvkk_accepted'
      from public.actor_profiles a
      where a.user_id = p_actor_id
    ),
    'photos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', g.id,
          'public_url', g.public_url,
          'kind', g.kind,
          'sort_order', g.sort_order
        )
        order by g.sort_order
      )
      from public.gallery_photos g
      where g.user_id = p_actor_id
    ), '[]'::jsonb),
    'videos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'kind', v.kind,
          'playback_url', v.playback_url
        )
      )
      from public.videos v
      where v.user_id = p_actor_id
        and v.playback_url is not null
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.actor_share_item(uuid) from public;

drop function if exists public.open_actor_share(text);
drop function if exists public.open_actor_share(text, text);

create or replace function public.open_actor_share(p_token text, p_pin text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  s public.actor_shares;
  ids uuid[];
  aid uuid;
  items jsonb := '[]'::jsonb;
  item jsonb;
  first jsonb;
  given_hash text;
begin
  if p_token is null or length(p_token) < 16 then
    return jsonb_build_object('error', 'unavailable');
  end if;

  select * into s
  from public.actor_shares
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

  ids := coalesce(nullif(s.actor_ids, '{}'), array[s.actor_id]);

  foreach aid in array ids
  loop
    item := public.actor_share_item(aid);
    if item -> 'profile' is not null and item -> 'profile' != 'null'::jsonb then
      items := items || jsonb_build_array(item);
    end if;
  end loop;

  if jsonb_array_length(items) = 0 then
    return jsonb_build_object('error', 'unavailable');
  end if;

  first := items -> 0;
  return jsonb_build_object(
    'items', items,
    'profile', first -> 'profile',
    'actor', first -> 'actor',
    'photos', first -> 'photos',
    'videos', first -> 'videos'
  );
end;
$$;

revoke all on function public.open_actor_share(text, text) from public;
grant execute on function public.open_actor_share(text, text) to anon, authenticated;
