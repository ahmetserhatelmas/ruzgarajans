import { supabase } from '@/lib/supabase';

export type StorageImageBucket = 'avatars' | 'covers' | 'gallery';

async function readLocalFile(localUri: string, mimeType?: string | null): Promise<ArrayBuffer> {
  const res = await fetch(localUri);
  if (!res.ok) {
    throw new Error(`Dosya okunamadı (${res.status})`);
  }
  return res.arrayBuffer();
}

function extFromMime(mimeType?: string | null): string {
  if (!mimeType) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('heic') || mimeType.includes('heif')) return 'heic';
  return 'jpg';
}

/** Public Supabase Storage upload (avatars / covers / gallery). */
export async function uploadImageToStorage(input: {
  userId: string;
  localUri: string;
  mimeType?: string | null;
  bucket: StorageImageBucket;
  /** Extra path segment, e.g. gallery kind */
  fileKey?: string;
}): Promise<{ url: string; path: string }> {
  const ext = extFromMime(input.mimeType);
  const key = input.fileKey ?? `${Date.now()}`;
  const path = `${input.userId}/${key}.${ext}`;
  const body = await readLocalFile(input.localUri, input.mimeType);

  const { error } = await supabase.storage.from(input.bucket).upload(path, body, {
    contentType: input.mimeType ?? 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(input.bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
