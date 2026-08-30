-- Public share links must always have a PIN. Old PIN-less rows are revoked.

update public.actor_shares
set revoked_at = now()
where pin_hash is null
  and revoked_at is null;

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
  result jsonb;
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
      where p.id = s.actor_id
    ),
    'actor', (
      select to_jsonb(a)
        - 'iban'
        - 'bank_name'
        - 'bank_account_name'
        - 'kvkk_accepted'
      from public.actor_profiles a
      where a.user_id = s.actor_id
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
      where g.user_id = s.actor_id
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
      where v.user_id = s.actor_id
        and v.playback_url is not null
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.open_actor_share(text, text) from public;
grant execute on function public.open_actor_share(text, text) to anon, authenticated;
