-- Media kinds for registration portfolio
alter type public.video_kind add value if not exists 'mimic';
alter type public.video_kind add value if not exists 'talent';

alter table public.actor_profiles
  add column if not exists mimic_video_id text,
  add column if not exists mimic_video_playback_url text,
  add column if not exists talent_video_id text,
  add column if not exists talent_video_playback_url text;

alter table public.gallery_photos
  add column if not exists kind text;

create unique index if not exists gallery_photos_user_kind_uidx
  on public.gallery_photos (user_id, kind)
  where kind is not null;
