-- Cloudflare Images ids for gallery photos
alter table public.gallery_photos
  add column if not exists cf_image_id text;
