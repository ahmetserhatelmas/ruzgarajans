import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_CACHE_TAGS } from "@/lib/admin-cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PHOTO_BUCKETS = ["avatars", "covers", "gallery"];

export type MediaUsage = {
  photos: { bytes: number; count: number } | null;
  videos: {
    bytes: number | null;
    count: number;
    minutes: number | null;
    minutesLimit: number | null;
  } | null;
};

type StorageRow = {
  photos: { bytes: number; count: number };
  videoCount: number;
};

async function storageRow(supabase: SupabaseClient): Promise<StorageRow> {
  const { data, error } = await supabase.rpc("admin_media_storage");
  if (!error && data && typeof data === "object") {
    const row = data as { bytes?: unknown; count?: unknown; video_count?: unknown };
    const photos = { bytes: Number(row.bytes ?? 0), count: Number(row.count ?? 0) };
    if (row.video_count != null) {
      return { photos, videoCount: Number(row.video_count) };
    }
    const { count } = await supabase
      .from("videos")
      .select("id", { count: "exact", head: true })
      .not("cf_uid", "is", null)
      .in("status", ["ready", "uploading"]);
    return { photos, videoCount: count ?? 0 };
  }

  const [{ count: videoCount }, photos] = await Promise.all([
    supabase
      .from("videos")
      .select("id", { count: "exact", head: true })
      .not("cf_uid", "is", null)
      .in("status", ["ready", "uploading"]),
    photoFallback(supabase),
  ]);
  return { photos, videoCount: videoCount ?? 0 };
}

async function photoFallback(supabase: SupabaseClient): Promise<{ bytes: number; count: number }> {
  const pageSize = 1000;
  let from = 0;
  let bytes = 0;
  let count = 0;
  for (let page = 0; page < 40; page += 1) {
    const { data: rows, error: listError } = await supabase
      .schema("storage")
      .from("objects")
      .select("metadata")
      .in("bucket_id", PHOTO_BUCKETS)
      .range(from, from + pageSize - 1);
    if (listError) throw listError;
    const batch = rows ?? [];
    for (const row of batch) {
      count += 1;
      const size = Number((row.metadata as { size?: unknown } | null)?.size ?? 0);
      if (Number.isFinite(size) && size > 0) bytes += size;
    }
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return { bytes, count };
}

async function cloudflareFromEnv(): Promise<MediaUsage["videos"]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token =
    process.env.CLOUDFLARE_STREAM_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) return null;
  const headers = { Authorization: `Bearer ${token}` };
  const usageRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/storage-usage`,
    { headers },
  );
  const usageJson = (await usageRes.json().catch(() => null)) as {
    result?: { videoCount?: number; totalStorageMinutes?: number; totalStorageMinutesLimit?: number };
  } | null;
  const usage = usageJson?.result ?? {};

  let bytes = 0;
  let count = 0;
  let page = 1;
  while (page <= 20) {
    const listRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?per_page=1000&page=${page}`,
      { headers },
    );
    const listJson = (await listRes.json().catch(() => null)) as {
      success?: boolean;
      result?: { size?: number }[];
      result_info?: { total_count?: number };
    } | null;
    if (!listRes.ok || listJson?.success === false) break;
    const videos = Array.isArray(listJson?.result) ? listJson.result : [];
    for (const video of videos) {
      const size = Number(video?.size);
      if (Number.isFinite(size) && size > 0) bytes += size;
      count += 1;
    }
    const total = Number(listJson?.result_info?.total_count ?? videos.length);
    if (videos.length === 0 || page * 1000 >= total) break;
    page += 1;
  }

  return {
    bytes: bytes > 0 ? bytes : null,
    count: Number(usage.videoCount ?? count),
    minutes: usage.totalStorageMinutes ?? null,
    minutesLimit: usage.totalStorageMinutesLimit ?? null,
  };
}

function parseIsoDuration(value: string) {
  const match = /^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i.exec(
    value.trim(),
  );
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

function estimateMpdBytes(xml: string) {
  const durationMatch = xml.match(/mediaPresentationDuration="([^"]+)"/);
  const seconds = durationMatch ? parseIsoDuration(durationMatch[1]) : 0;
  if (seconds <= 0) return null;

  let videoBandwidth = 0;
  let audioBandwidth = 0;
  for (const set of xml.split(/<AdaptationSet\b/).slice(1)) {
    const mime = (set.match(/mimeType="([^"]+)"/)?.[1] ?? "").toLowerCase();
    const bandwidths = [...set.matchAll(/\bbandwidth="(\d+)"/gi)].map((row) => Number(row[1]));
    if (bandwidths.length === 0) continue;
    const peak = Math.max(...bandwidths);
    if (mime.startsWith("audio")) audioBandwidth = Math.max(audioBandwidth, peak);
    else videoBandwidth = Math.max(videoBandwidth, peak);
  }

  const bandwidth = videoBandwidth + audioBandwidth;
  if (bandwidth <= 0) return null;
  return { bytes: Math.round((bandwidth * seconds) / 8), seconds };
}

async function videoUids(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("videos")
    .select("cf_uid")
    .not("cf_uid", "is", null)
    .in("status", ["ready", "uploading"]);
  return [
    ...new Set(
      (data ?? [])
        .map((row) => String((row as { cf_uid?: string | null }).cf_uid ?? "").trim())
        .filter(Boolean),
    ),
  ];
}

async function publicStreamUsage(uids: string[]): Promise<MediaUsage["videos"]> {
  const subdomain = process.env.NEXT_PUBLIC_CF_CUSTOMER_SUBDOMAIN?.trim();
  if (!subdomain || uids.length === 0) return null;

  let bytes = 0;
  let seconds = 0;
  let ok = 0;
  await Promise.all(
    uids.map(async (uid) => {
      try {
        const res = await fetch(`https://${subdomain}/${uid}/manifest/video.mpd`, {
          headers: { "user-agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });
        if (!res.ok) return;
        const estimated = estimateMpdBytes(await res.text());
        if (!estimated) return;
        bytes += estimated.bytes;
        seconds += estimated.seconds;
        ok += 1;
      } catch {
        // One missing playlist should not hide the rest.
      }
    }),
  );
  if (ok === 0) return null;
  return {
    bytes,
    count: uids.length,
    minutes: seconds > 0 ? seconds / 60 : null,
    minutesLimit: null,
  };
}

async function videoUsage(supabase: SupabaseClient): Promise<MediaUsage["videos"]> {
  const [fromEnv, uids] = await Promise.all([
    cloudflareFromEnv().catch(() => null),
    videoUids(supabase),
  ]);
  if (fromEnv?.bytes) return fromEnv;
  return (await publicStreamUsage(uids).catch(() => null)) ?? fromEnv;
}

async function cachedStorage() {
  const load = async () => {
    const service = createServiceClient();
    const supabase = service ?? (await createClient());
    return storageRow(supabase);
  };
  if (!createServiceClient()) return load();
  return unstable_cache(load, ["admin-media-storage-v2"], {
    revalidate: 60,
    tags: [ADMIN_CACHE_TAGS.dashboard],
  })();
}

async function cachedVideoUsage() {
  const load = async () => {
    const service = createServiceClient();
    const supabase = service ?? (await createClient());
    return videoUsage(supabase);
  };
  if (!createServiceClient()) return load();
  return unstable_cache(load, ["admin-media-videos-v3"], {
    revalidate: 120,
    tags: [ADMIN_CACHE_TAGS.dashboard],
  })();
}

export async function getMediaUsage(): Promise<MediaUsage> {
  const [row, remoteVideos] = await Promise.all([
    cachedStorage().catch(() => null),
    cachedVideoUsage().catch(() => null),
  ]);
  const videoCount = Math.max(row?.videoCount ?? 0, remoteVideos?.count ?? 0);
  return {
    photos: row?.photos ?? null,
    videos:
      videoCount > 0 || remoteVideos
        ? {
            bytes: remoteVideos?.bytes ?? null,
            count: videoCount,
            minutes: remoteVideos?.minutes ?? null,
            minutesLimit: remoteVideos?.minutesLimit ?? null,
          }
        : null,
  };
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toLocaleString("tr-TR", {
    minimumFractionDigits: digits === 0 ? 0 : 1,
    maximumFractionDigits: digits,
  })} ${units[unit]}`;
}

export function formatMinutes(minutes: number) {
  return `${minutes.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} dk`;
}
