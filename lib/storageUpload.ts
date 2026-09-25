import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';

export type StorageImageBucket = 'avatars' | 'covers' | 'gallery';

const MAX_EDGE = 1920;

async function compressForUpload(localUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(localUri);
  const original = await context.renderAsync();
  if (Math.max(original.width, original.height) > MAX_EDGE) {
    context.reset();
    if (original.width >= original.height) context.resize({ width: MAX_EDGE });
    else context.resize({ height: MAX_EDGE });
  }
  const rendered =
    Math.max(original.width, original.height) > MAX_EDGE
      ? await context.renderAsync()
      : original;
  const saved = await rendered.saveAsync({
    compress: 0.78,
    format: SaveFormat.JPEG,
  });
  return saved.uri;
}

async function readLocalFile(localUri: string): Promise<ArrayBuffer> {
  const res = await fetch(localUri);
  if (!res.ok) {
    throw new Error(`Dosya okunamadı (${res.status})`);
  }
  return res.arrayBuffer();
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
  let uri = input.localUri;
  try {
    uri = await compressForUpload(input.localUri);
  } catch {
    uri = input.localUri;
  }
  const key = input.fileKey ?? `${Date.now()}`;
  const path = `${input.userId}/${key}.jpg`;
  const body = await readLocalFile(uri);

  const { error } = await supabase.storage.from(input.bucket).upload(path, body, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(input.bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
