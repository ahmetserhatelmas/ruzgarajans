import { ageFromBirth, GENDER, label } from "@/lib/labels";
import { displayImageUrl } from "@/lib/media";
import { buildXlsxBytes, type SheetImage } from "@/lib/export-table-xlsx";
import type { ActorRow } from "@/lib/types";

export const SELECTED_ACTOR_EXCEL_HEADERS = [
  "İsim soyisim",
  "Yaş",
  "Cinsiyet",
  "Beden bilgileri",
  "Adres",
  "Telefon",
  "WhatsApp",
  "Göğüs plan",
];

const PHOTO_COL = 7;

function bodyInfo(actor: ActorRow["actor"]) {
  if (!actor) return "";
  const parts: string[] = [];
  if (actor.height_cm != null) parts.push(`Boy ${actor.height_cm} cm`);
  if (actor.weight_kg != null) parts.push(`Kilo ${actor.weight_kg} kg`);
  if (actor.body_size) parts.push(`Beden ${actor.body_size}`);
  if (actor.tshirt_size) parts.push(`Tişört ${actor.tshirt_size}`);
  if (actor.pants_size) parts.push(`Pantolon ${actor.pants_size}`);
  if (actor.suit_size) parts.push(`Takım ${actor.suit_size}`);
  if (actor.shoe_size) parts.push(`Ayakkabı ${actor.shoe_size}`);
  return parts.join(" · ");
}

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function imageExt(bytes: Uint8Array): "jpeg" | "png" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }
  return null;
}

export async function buildSelectedActorsXlsx(rows: ActorRow[]): Promise<Uint8Array> {
  const data = rows.map((row) => [
    row.profile.full_name || "",
    ageFromBirth(row.actor?.birth_date)?.toString() ?? "",
    label(GENDER, row.actor?.gender),
    bodyInfo(row.actor),
    row.actor?.address || "",
    row.profile.phone || "",
    row.actor?.whatsapp || "",
    "",
  ]);

  const images: SheetImage[] = [];
  await Promise.all(
    rows.map(async (row, index) => {
      const src = displayImageUrl(row.chestPhotoUrl, 360) ?? row.chestPhotoUrl;
      if (!src) return;
      const bytes = await fetchImageBytes(src);
      if (!bytes) return;
      const ext = imageExt(bytes);
      if (!ext) return;
      images.push({ rowIndex: index, colIndex: PHOTO_COL, bytes, ext });
    }),
  );

  return buildXlsxBytes(SELECTED_ACTOR_EXCEL_HEADERS, data, "Oyuncular", images);
}
