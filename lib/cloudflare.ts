import { Platform } from 'react-native';
import { File, UploadType } from 'expo-file-system';
import { cacheDirectory, copyAsync } from 'expo-file-system/legacy';
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
    let detail = error.message || 'Cloudflare Images upload URL alınamadı';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const payload = await ctx.json();
        if (payload?.error) {
          detail =
            typeof payload.error === 'string'
              ? payload.error
              : JSON.stringify(payload.error);
        }
      }
    } catch {
      // keep generic message
    }
    throw new Error(detail);
  }

  if (!data?.uploadURL || !data?.id) {
    throw new Error(
      (data as { error?: string } | null)?.error ||
        'Geçersiz Cloudflare Images yanıtı'
    );
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
  variant: string = 'w=800,h=800,fit=cover',
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

const EXT_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/3gpp': '3gp',
  'video/webm': 'webm',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

const MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  '3gp': 'video/3gpp',
  webm: 'video/webm',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

function guessExt(uri: string, mimeType?: string | null, fallback = 'mp4') {
  if (mimeType && EXT_BY_MIME[mimeType]) return EXT_BY_MIME[mimeType];
  const clean = uri.split('?')[0] ?? uri;
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : fallback;
}

function guessMime(ext: string, mimeType: string | null | undefined, fallback: string) {
  if (mimeType && mimeType !== 'application/octet-stream') return mimeType;
  return MIME_BY_EXT[ext] ?? fallback;
}

async function fileForUpload(
  localUri: string,
  mimeType: string | null | undefined,
  fallbackMime: string
) {
  const ext = guessExt(localUri, mimeType, fallbackMime.startsWith('image/') ? 'jpg' : 'mp4');
  const mime = guessMime(ext, mimeType, fallbackMime);
  const cacheRoot = cacheDirectory ?? '';
  const shouldCopy =
    Platform.OS === 'android' ||
    localUri.startsWith('content://') ||
    localUri.startsWith('ph://');

  if (shouldCopy && cacheRoot) {
    const dest = `${cacheRoot}cf-up-${Date.now()}.${ext}`;
    try {
      await copyAsync({ from: localUri, to: dest });
      return { file: new File(dest), mimeType: mime };
    } catch {
      // Fall back to the original URI if the copy is refused.
    }
  }

  return { file: new File(localUri), mimeType: mime };
}

function uploadSucceeded(result: { status?: number; body?: string }) {
  const status = Number(result.status);
  if (status >= 200 && status < 300) return true;
  if (status !== 0 && !Number.isNaN(status)) return false;

  const raw = (result.body ?? '').trim();
  if (!raw) return true;
  try {
    const json = JSON.parse(raw) as {
      success?: boolean;
      errors?: unknown;
      result?: unknown;
      uid?: unknown;
    };
    if (json.success === false || json.errors) return false;
    if (json.success === true || json.result || json.uid) return true;
  } catch {
    // not JSON
  }
  const lower = raw.toLowerCase();
  if (lower.includes('error') && !lower.includes('success')) return false;
  return true;
}

async function uploadLocalFile(input: {
  localUri: string;
  uploadURL: string;
  mimeType: string;
  failLabel: string;
  onProgress?: UploadProgressCallback;
}) {
  const { file, mimeType } = await fileForUpload(input.localUri, input.mimeType, input.mimeType);
  const result = await file.upload(input.uploadURL, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType,
    ...(Platform.OS === 'ios' ? { sessionType: 'foreground' as const } : {}),
    onProgress: ({ bytesSent, totalBytes }) => {
      const total = totalBytes > 0 ? totalBytes : 0;
      const percent =
        total > 0 ? Math.min(100, Math.round((bytesSent / total) * 100)) : 0;
      input.onProgress?.({ bytesSent, totalBytes: total, percent });
    },
  });

  if (!uploadSucceeded(result)) {
    throw new Error(`${input.failLabel}: ${result.status} ${result.body}`);
  }

  input.onProgress?.({ bytesSent: 1, totalBytes: 1, percent: 100 });
}

/**
 * Uploads a local video file to Cloudflare Stream via direct upload URL.
 */
export async function uploadVideoToStream(
  localUri: string,
  uploadURL: string,
  onProgress?: UploadProgressCallback,
  mimeType?: string | null
): Promise<void> {
  await uploadLocalFile({
    localUri,
    uploadURL,
    mimeType: mimeType ?? 'video/mp4',
    failLabel: 'Video yükleme başarısız',
    onProgress,
  });
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
  await uploadLocalFile({
    localUri,
    uploadURL,
    mimeType,
    failLabel: 'Görsel yükleme başarısız',
    onProgress,
  });
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
