alter type public.user_role add value if not exists 'cast_director';

create table if not exists public.actor_shares (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.profiles (id),
  recipient_id uuid references public.profiles (id) on delete set null,
  note text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists actor_shares_actor_idx on public.actor_shares (actor_id);
create index if not exists actor_shares_recipient_idx on public.actor_shares (recipient_id);

alter table public.actor_shares enable row level security;

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
    where s.actor_id = p_actor_id
      and s.recipient_id = auth.uid()
      and s.revoked_at is null
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

drop policy if exists "actor_shares_admin" on public.actor_shares;
create policy "actor_shares_admin"
  on public.actor_shares for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "actor_shares_director_read" on public.actor_shares;
create policy "actor_shares_director_read"
  on public.actor_shares for select
  using (
    recipient_id = auth.uid()
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  );

drop policy if exists "profiles_select_director_share" on public.profiles;
create policy "profiles_select_director_share"
  on public.profiles for select
  using (public.director_can_view(id));

drop policy if exists "actor_profiles_select_director" on public.actor_profiles;
create policy "actor_profiles_select_director"
  on public.actor_profiles for select
  using (public.director_can_view(user_id));

drop policy if exists "gallery_select_director" on public.gallery_photos;
create policy "gallery_select_director"
  on public.gallery_photos for select
  using (public.director_can_view(user_id));

drop policy if exists "videos_select_director" on public.videos;
create policy "videos_select_director"
  on public.videos for select
  using (public.director_can_view(user_id));

create or replace function public.open_actor_share(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.actor_shares;
  result jsonb;
begin
  if p_token is null or length(p_token) < 16 then
    return null;
  end if;

  select * into s
  from public.actor_shares
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if not found then
    return null;
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

grant execute on function public.open_actor_share(text) to anon, authenticated;
grant execute on function public.director_can_view(uuid) to authenticated;
grant select, insert, update, delete on public.actor_shares to authenticated;
grant select, insert, update, delete on public.actor_shares to service_role;
