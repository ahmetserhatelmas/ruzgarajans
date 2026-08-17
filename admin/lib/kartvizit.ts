import { DANCES, EYES, HAIR, SPORTS, formatLanguages, label } from "@/lib/labels";
import { displayImageUrl } from "@/lib/media";
import type { ActorProfile, GalleryPhoto } from "@/lib/types";

export const KARTVIZIT_PHOTO_KINDS = [
  "full_body",
  "profile_left",
  "profile_right",
  "chest",
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
    actor?.performance_skills?.join(", "),
    actor?.model_skills?.join(", "),
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
    { label: "Deneyimleri", value: blank(actor?.experience) },
    { label: "Yetenekleri", value: talents },
  ];
}

export function kartvizitPhotos(photos: GalleryPhoto[]) {
  const url = (kind: string) => {
    const photo = photos.find((item) => item.kind === kind);
    return displayImageUrl(photo?.public_url, 1600);
  };

  return {
    fullBody: url("full_body"),
    profileLeft: url("profile_left"),
    profileRight: url("profile_right"),
    chest: url("chest"),
  };
}
