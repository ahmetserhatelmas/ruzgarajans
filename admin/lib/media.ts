const CF_HASH = process.env.NEXT_PUBLIC_CF_IMAGES_HASH?.trim();

/**
 * Browser-safe image URL.
 * iPhone uploads are often HEIC — Chrome cannot render those.
 * Supabase image transform converts them to JPEG.
 */
export function displayImageUrl(
  url: string | null | undefined,
  width = 800
): string | null {
  if (!url?.trim()) return null;
  const raw = url.trim();

  try {
    const parsed = new URL(raw);
    const objectPath = parsed.pathname.match(/^\/storage\/v1\/object\/public\/(.+)$/);
    if (objectPath) {
      return `${parsed.origin}/storage/v1/render/image/public/${objectPath[1]}?width=${width}&resize=contain`;
    }

    if (parsed.hostname === "imagedelivery.net") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && parts[2] === "public") {
        return `https://imagedelivery.net/${parts[0]}/${parts[1]}/w=${width},fit=scale-down`;
      }
    }

    return raw;
  } catch {
    if (CF_HASH && /^[0-9a-f-]{16,}$/i.test(raw)) {
      return `https://imagedelivery.net/${CF_HASH}/${raw}/w=${width},fit=scale-down`;
    }
    return raw;
  }
}
