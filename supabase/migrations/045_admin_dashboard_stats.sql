-- Fast admin dashboard: one round-trip instead of loading every row.
create or replace function public.admin_dashboard_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Cookie/JWT callers must be admin. Service role (auth.uid null) is allowed
  -- only from the admin app after requireAdminPerm.
  if auth.uid() is not null
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'admin'
     ) then
    raise exception 'forbidden';
  end if;

  return json_build_object(
    'actors', (
      select count(*)::int from public.profiles where role = 'actor'
    ),
    'approved', (
      select count(*)::int from public.profiles
      where role = 'actor' and actor_status = 'approved'
    ),
    'rejected', (
      select count(*)::int from public.profiles
      where role = 'actor' and actor_status = 'rejected'
    ),
    'pending', (
      select count(*)::int
      from public.profiles p
      join public.actor_profiles a on a.user_id = p.id
      where p.role = 'actor'
        and p.actor_status = 'pending'
        and a.registration_completed_at is not null
    ),
    'no_form', (
      select count(*)::int
      from public.profiles p
      left join public.actor_profiles a on a.user_id = p.id
      where p.role = 'actor'
        and a.form_saved_at is null
        and a.registration_completed_at is null
    ),
    'no_media', (
      select count(*)::int
      from public.profiles p
      left join public.actor_profiles a on a.user_id = p.id
      where p.role = 'actor'
        and not (
          (a.media_saved_at is not null or a.registration_completed_at is not null)
          and a.intro_video_playback_url is not null
          and a.mimic_video_playback_url is not null
          and (
            select count(distinct g.kind)
            from public.gallery_photos g
            where g.user_id = p.id
              and g.kind in ('full_body', 'chest', 'profile_right', 'profile_left')
          ) = 4
        )
    ),
    'published_casts', (
      select count(*)::int from public.cast_listings where is_published
    ),
    'applications', (
      select count(*)::int from public.applications
    ),
    'app_by_status', (
      select coalesce(json_object_agg(status, cnt), '{}'::json)
      from (
        select status::text as status, count(*)::int as cnt
        from public.applications
        group by status
      ) s
    )
  );
end;
$$;

revoke all on function public.admin_dashboard_stats() from public;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_dashboard_stats() to service_role;

create index if not exists profiles_role_status_idx
  on public.profiles (role, actor_status);

create index if not exists actor_profiles_registration_idx
  on public.actor_profiles (registration_completed_at)
  where registration_completed_at is not null;

create index if not exists gallery_photos_user_kind_idx
  on public.gallery_photos (user_id, kind);

create index if not exists applications_status_idx
  on public.applications (status);

create index if not exists cast_listings_published_idx
  on public.cast_listings (is_published)
  where is_published;
