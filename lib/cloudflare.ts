import { File, UploadType } from 'expo-file-system';
import { supabase } from './supabase';

export type DirectUploadResult = {
  uploadURL: string;
  uid: string;
};

export type ImagesDirectUploadResult = {
  uploadURL: string;
  id: string;
  accountHash: string | null;
};

/**
 * Asks a Supabase Edge Function for a Cloudflare Stream direct-upload URL.
 * The CF API token stays server-side.
 */
export async function createStreamDirectUpload(
  meta?: Record<string, string>
): Promise<DirectUploadResult> {
  const { data, error } = await supabase.functions.invoke('cf-stream-upload', {
    body: { meta: meta ?? {} },
  });

  if (error) {
    throw new Error(error.message || 'Cloudflare upload URL alınamadı');
  }

  if (!data?.uploadURL || !data?.uid) {
    throw new Error('Geçersiz Cloudflare yanıtı');
  }

  return { uploadURL: data.uploadURL, uid: data.uid };
}

/**
 * Asks Edge Function for a Cloudflare Images one-time upload URL.
 */
export async function createImagesDirectUpload(
  meta?: Record<string, string>
): Promise<ImagesDirectUploadResult> {
  const { data, error } = await supabase.functions.invoke('cf-images-upload', {
    body: { meta: meta ?? {}, requireSignedURLs: false },
  });

  if (error) {
    throw new Error(error.message || 'Cloudflare Images upload URL alınamadı');
  }

  if (!data?.uploadURL || !data?.id) {
    throw new Error('Geçersiz Cloudflare Images yanıtı');
  }

  return {
    uploadURL: data.uploadURL as string,
    id: data.id as string,
    accountHash: (data.accountHash as string | null) ?? null,
  };
}

export function streamPlaybackUrl(uid: string): string {
  const subdomain =
    process.env.EXPO_PUBLIC_CF_CUSTOMER_SUBDOMAIN ??
    'customer.cloudflarestream.com';
  return `https://${subdomain}/${uid}/manifest/video.m3u8`;
}

export function streamThumbnailUrl(uid: string): string {
  const subdomain =
    process.env.EXPO_PUBLIC_CF_CUSTOMER_SUBDOMAIN ??
    'customer.cloudflarestream.com';
  return `https://${subdomain}/${uid}/thumbnails/thumbnail.jpg`;
}

/** Account hash for imagedelivery.net — from env or last upload response. */
let cachedImagesHash: string | null =
  process.env.EXPO_PUBLIC_CF_IMAGES_HASH?.trim() || null;

export function setCfImagesAccountHash(hash: string | null | undefined) {
  if (hash) cachedImagesHash = hash;
}

export function getCfImagesAccountHash(): string | null {
  return cachedImagesHash;
}

/**
 * Delivery URL for a Cloudflare Image.
 * variant: named variant (public) or flexible e.g. "w=400,h=400,fit=cover"
 */
export function cfImageUrl(
  imageId: string,
  variant: string = 'public',
  accountHash?: string | null
): string {
  const hash = accountHash || cachedImagesHash;
  if (!hash) {
    throw new Error(
      'CF Images account hash eksik. EXPO_PUBLIC_CF_IMAGES_HASH ayarla veya bir kez yükle.'
    );
  }
  return `https://imagedelivery.net/${hash}/${imageId}/${variant}`;
}

export type UploadProgressCallback = (progress: {
  bytesSent: number;
  totalBytes: number;
  percent: number;
}) => void;

/**
 * Uploads a local video file to Cloudflare Stream via direct upload URL.
 */
export async function uploadVideoToStream(
  localUri: string,
  uploadURL: string,
  onProgress?: UploadProgressCallback
): Promise<void> {
  const file = new File(localUri);
  const result = await file.upload(uploadURL, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'video/mp4',
    sessionType: 'foreground',
    onProgress: ({ bytesSent, totalBytes }) => {
      if (!onProgress) return;
      const total = totalBytes > 0 ? totalBytes : 0;
      const percent =
        total > 0 ? Math.min(100, Math.round((bytesSent / total) * 100)) : 0;
      onProgress({ bytesSent, totalBytes: total, percent });
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Video yükleme başarısız: ${result.status} ${result.body}`);
  }

  onProgress?.({ bytesSent: 1, totalBytes: 1, percent: 100 });
}

/**
 * Uploads a local image to Cloudflare Images via one-time upload URL.
 */
export async function uploadImageToCf(
  localUri: string,
  uploadURL: string,
  mimeType: string = 'image/jpeg',
  onProgress?: UploadProgressCallback
): Promise<void> {
  const file = new File(localUri);
  const result = await file.upload(uploadURL, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType,
    sessionType: 'foreground',
    onProgress: ({ bytesSent, totalBytes }) => {
      if (!onProgress) return;
      const total = totalBytes > 0 ? totalBytes : 0;
      const percent =
        total > 0 ? Math.min(100, Math.round((bytesSent / total) * 100)) : 0;
      onProgress({ bytesSent, totalBytes: total, percent });
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Görsel yükleme başarısız: ${result.status} ${result.body}`);
  }

  onProgress?.({ bytesSent: 1, totalBytes: 1, percent: 100 });
}

/**
 * Full flow: request direct upload URL → upload file → return id + delivery URL.
 */
export async function uploadImageViaCloudflare(input: {
  localUri: string;
  mimeType?: string | null;
  meta?: Record<string, string>;
  variant?: string;
}): Promise<{ id: string; url: string; accountHash: string | null }> {
  const { uploadURL, id, accountHash } = await createImagesDirectUpload(input.meta);
  if (accountHash) setCfImagesAccountHash(accountHash);

  await uploadImageToCf(input.localUri, uploadURL, input.mimeType ?? 'image/jpeg');

  const url = cfImageUrl(id, input.variant ?? 'public', accountHash);
  return { id, url, accountHash };
}
