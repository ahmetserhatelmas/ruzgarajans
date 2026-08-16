import { supabase } from '@/lib/supabase';
import { uploadImageViaCloudflare } from '@/lib/cloudflare';

export const REQUIRED_PHOTO_KINDS = [
  'full_body',
  'chest',
  'profile_right',
  'profile_left',
] as const;

export const OPTIONAL_PHOTO_KINDS = ['model_pose', 'hands'] as const;

export const ALL_PHOTO_KINDS = [...REQUIRED_PHOTO_KINDS, ...OPTIONAL_PHOTO_KINDS] as const;

export type GalleryPhotoKind = (typeof ALL_PHOTO_KINDS)[number];

export type GalleryPhoto = {
  id: string;
  user_id: string;
  storage_path: string;
  public_url: string;
  cf_image_id: string | null;
  kind: GalleryPhotoKind | null;
  sort_order: number;
  created_at: string;
};

export async function fetchGalleryPhotos(userId: string): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from('gallery_photos')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as GalleryPhoto[];
}

export async function upsertGalleryPhoto(input: {
  userId: string;
  kind: GalleryPhotoKind;
  localUri: string;
  mimeType?: string | null;
}): Promise<GalleryPhoto> {
  const uploaded = await uploadImageViaCloudflare({
    localUri: input.localUri,
    mimeType: input.mimeType,
    meta: {
      kind: input.kind,
      userId: input.userId,
    },
  });

  const storagePath = `cf:${uploaded.id}`;
  const { data: existing } = await supabase
    .from('gallery_photos')
    .select('id')
    .eq('user_id', input.userId)
    .eq('kind', input.kind)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from('gallery_photos')
      .update({
        storage_path: storagePath,
        public_url: uploaded.url,
        cf_image_id: uploaded.id,
      })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data as GalleryPhoto;
  }

  const sortOrder = ALL_PHOTO_KINDS.indexOf(input.kind);
  const { data, error } = await supabase
    .from('gallery_photos')
    .insert({
      user_id: input.userId,
      storage_path: storagePath,
      public_url: uploaded.url,
      cf_image_id: uploaded.id,
      kind: input.kind,
      sort_order: sortOrder >= 0 ? sortOrder : 0,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as GalleryPhoto;
}

export function photosByKind(
  photos: GalleryPhoto[]
): Partial<Record<GalleryPhotoKind, GalleryPhoto>> {
  const map: Partial<Record<GalleryPhotoKind, GalleryPhoto>> = {};
  for (const p of photos) {
    if (p.kind && (ALL_PHOTO_KINDS as readonly string[]).includes(p.kind)) {
      map[p.kind as GalleryPhotoKind] = p;
    }
  }
  return map;
}

export function missingRequiredPhotos(photos: GalleryPhoto[]): GalleryPhotoKind[] {
  const map = photosByKind(photos);
  return REQUIRED_PHOTO_KINDS.filter((k) => !map[k]);
}
