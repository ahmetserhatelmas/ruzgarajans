import { DANCES, EDUCATION, EYES, HAIR, MODEL, PERFORMANCE, SPORTS, formatLanguages, label } from "@/lib/labels";
import { displayImageUrl } from "@/lib/media";
import type { ActorProfile, GalleryPhoto } from "@/lib/types";

export const KARTVIZIT_PHOTO_KINDS = [
  "full_body",
  "model_pose",
  "chest",
  "favorite_1",
] as const;

function blank(value?: string | number | null) {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text || text === "—") return "";
  return text;
}

function mapped(map: Record<string, string>, key?: string | null) {
  if (!key) return "";
  const value = label(map, key);
  return value === "—" ? "" : value;
}

function mappedList(map: Record<string, string>, keys?: string[] | null) {
  if (!keys?.length) return "";
  return keys
    .filter((key) => key && key !== "none")
    .map((key) => map[key] ?? key)
    .filter(Boolean)
    .join(", ");
}

function joinParts(...parts: (string | null | undefined)[]) {
  return parts.map((part) => blank(part)).filter(Boolean).join(", ");
}

export function birthYear(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getFullYear());
}

export function kartvizitFields(actor: ActorProfile | null) {
  const languages = blank(formatLanguages(actor?.languages));
  const talents = joinParts(
    mappedList(DANCES, actor?.dances),
    actor?.dances_other,
    mappedList(SPORTS, actor?.sports),
    mappedList(PERFORMANCE, actor?.performance_skills),
    mappedList(MODEL, actor?.model_skills),
    actor?.instruments,
    actor?.skills?.join(", "),
    actor?.special_interests
  );

  return [
    { label: "Doğum Tarihi", value: birthYear(actor?.birth_date) },
    { label: "Boy", value: blank(actor?.height_cm) },
    { label: "Kilo", value: blank(actor?.weight_kg) },
    { label: "Göz Rengi", value: mapped(EYES, actor?.eye_color) },
    { label: "Saç Rengi", value: mapped(HAIR, actor?.hair_color) },
    { label: "Dil", value: languages },
    { label: "Eğitim", value: mapped(EDUCATION, actor?.education) },
    { label: "Oyunculuk Eğitimi", value: blank(actor?.acting_education) },
    { label: "Deneyimleri", value: blank(actor?.experience) },
    { label: "Yetenekleri", value: talents },
  ];
}

function photoSrc(photos: GalleryPhoto[], kind: string) {
  const photo = photos.find((item) => item.kind === kind);
  if (!photo?.public_url) return { src: null as string | null, key: null as string | null };
  return {
    src: displayImageUrl(photo.public_url, 1600) ?? photo.public_url,
    key: photo.public_url.split("?")[0],
  };
}

export function kartvizitPhotos(photos: GalleryPhoto[]) {
  const fullBody = photoSrc(photos, "full_body");
  const pose = photoSrc(photos, "model_pose");
  const chest = photoSrc(photos, "chest");
  const used = new Set([fullBody.key, pose.key, chest.key].filter(Boolean));

  const favorite = ["favorite_1", "favorite_2"]
    .map((kind) => photoSrc(photos, kind))
    .find((item) => item.src && item.key && !used.has(item.key)) ?? {
    src: null,
    key: null,
  };

  return {
    fullBody: fullBody.src,
    pose: pose.src,
    chest: chest.src,
    favorite: favorite.src,
  };
}
