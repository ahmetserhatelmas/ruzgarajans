-- Rüzgâr Ajans — initial schema
-- Run in Supabase SQL editor or via CLI

create extension if not exists "pgcrypto";

-- Roles
create type public.user_role as enum ('actor', 'admin');
create type public.actor_status as enum ('pending', 'approved', 'rejected');
create type public.application_status as enum (
  'submitted',
  'under_review',
  'shortlisted',
  'audition_invited',
  'accepted',
  'rejected'
);
create type public.gender_pref as enum ('female', 'male', 'any', 'non_binary');
create type public.video_kind as enum ('intro', 'showreel', 'audition', 'promo');
create type public.dialogue_mode as enum ('none', 'script_tts', 'audio_file');
create type public.notification_type as enum (
  'new_cast',
  'application_result',
  'audition_invite',
  'new_message',
  'announcement'
);

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'actor',
  email text,
  full_name text,
  phone text,
  locale text not null default 'tr',
  avatar_url text,
  cover_url text,
  actor_status public.actor_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.actor_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  bio text,
  height_cm numeric(5,1),
  weight_kg numeric(5,1),
  birth_date date,
  hair_color text,
  eye_color text,
  shoe_size text,
  body_size text,
  education text,
  experience text,
  languages text[] default '{}',
  skills text[] default '{}',
  gender text,
  city text,
  intro_video_id text,
  intro_video_playback_url text,
  showreel_video_id text,
  showreel_playback_url text,
  updated_at timestamptz not null default now()
);

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.cast_listings (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id),
  project_name text not null,
  role_name text not null,
  role_description text not null,
  age_min int,
  age_max int,
  gender public.gender_pref not null default 'any',
  height_min_cm numeric(5,1),
  height_max_cm numeric(5,1),
  shoot_date date,
  shoot_location text,
  deadline date,
  budget_amount numeric(12,2),
  budget_currency text not null default 'TRY',
  allow_budget_counter boolean not null default true,
  is_published boolean not null default false,
  dialogue_mode public.dialogue_mode not null default 'none',
  dialogue_script text,
  dialogue_audio_url text,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  cast_id uuid not null references public.cast_listings (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  status public.application_status not null default 'submitted',
  accept_budget boolean not null default true,
  counter_budget numeric(12,2),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cast_id, actor_id)
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cast_id uuid references public.cast_listings (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  kind public.video_kind not null,
  cf_uid text,
  playback_url text,
  thumbnail_url text,
  status text not null default 'uploading',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actor_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title_tr text not null,
  title_en text not null,
  body_tr text not null,
  body_en text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  data jsonb default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  cast_id uuid not null references public.cast_listings (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  password_hash text,
  expires_at timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_approved_actor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'actor'
      and p.actor_status = 'approved'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'actor')
  );
  insert into public.actor_profiles (user_id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger cast_listings_updated before update on public.cast_listings
  for each row execute function public.touch_updated_at();
create trigger applications_updated before update on public.applications
  for each row execute function public.touch_updated_at();
create trigger videos_updated before update on public.videos
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.actor_profiles enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.cast_listings enable row level security;
alter table public.applications enable row level security;
alter table public.videos enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.share_links enable row level security;

-- Profiles
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- Actor profiles
create policy "actor_profiles_select"
  on public.actor_profiles for select
  using (user_id = auth.uid() or public.is_admin());

create policy "actor_profiles_upsert_own"
  on public.actor_profiles for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Gallery
create policy "gallery_own_or_admin"
  on public.gallery_photos for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Casts: actors see published; admin all
create policy "casts_select"
  on public.cast_listings for select
  using (is_published = true or public.is_admin());

create policy "casts_admin_write"
  on public.cast_listings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Applications
create policy "applications_select"
  on public.applications for select
  using (actor_id = auth.uid() or public.is_admin());

create policy "applications_insert_actor"
  on public.applications for insert
  with check (actor_id = auth.uid() and public.is_approved_actor());

create policy "applications_update"
  on public.applications for update
  using (actor_id = auth.uid() or public.is_admin());

-- Videos
create policy "videos_select"
  on public.videos for select
  using (user_id = auth.uid() or public.is_admin());

create policy "videos_write_own"
  on public.videos for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy "videos_update_own_or_admin"
  on public.videos for update
  using (user_id = auth.uid() or public.is_admin());

-- Conversations / messages (actor <-> agency only)
create policy "conversations_select"
  on public.conversations for select
  using (actor_id = auth.uid() or public.is_admin());

create policy "conversations_insert_actor"
  on public.conversations for insert
  with check (actor_id = auth.uid() or public.is_admin());

create policy "messages_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.actor_id = auth.uid() or public.is_admin())
    )
  );

create policy "messages_insert"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.actor_id = auth.uid() or public.is_admin())
    )
  );

create policy "announcements_select_all"
  on public.announcements for select
  to authenticated
  using (true);

create policy "announcements_admin_write"
  on public.announcements for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "notifications_own"
  on public.notifications for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "share_links_admin"
  on public.share_links for all
  using (public.is_admin())
  with check (public.is_admin());

-- Storage buckets (run once; create via dashboard if preferred)
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('covers', 'covers', true),
  ('gallery', 'gallery', true),
  ('dialogue-audio', 'dialogue-audio', false)
on conflict (id) do nothing;

create policy "avatar_upload_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatar_read_public"
  on storage.objects for select
  using (bucket_id in ('avatars', 'covers', 'gallery'));

create policy "cover_upload_own"
  on storage.objects for insert
  with check (
    bucket_id = 'covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "gallery_upload_own"
  on storage.objects for insert
  with check (
    bucket_id = 'gallery'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "dialogue_audio_admin"
  on storage.objects for all
  using (bucket_id = 'dialogue-audio' and public.is_admin())
  with check (bucket_id = 'dialogue-audio' and public.is_admin());
