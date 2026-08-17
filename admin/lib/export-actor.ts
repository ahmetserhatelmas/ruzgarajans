import JSZip from "jszip";
import {
  ACTOR_STATUS,
  ageFromBirth,
  boolLabel,
  countryLabel,
  formatLanguages,
  DANCES,
  EYES,
  formatDate,
  GENDER,
  HAIR,
  label,
  listLabel,
  PHOTO_KIND,
  SPORTS,
  VIDEO_KIND,
} from "@/lib/labels";
import { displayImageUrl } from "@/lib/media";
import type { ActorProfile, GalleryPhoto, Profile, Video } from "@/lib/types";

type ExportInput = {
  profile: Profile;
  actor: ActorProfile | null;
  photos: GalleryPhoto[];
  videos: Video[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value: string) {
  return (
    value
      .toLocaleLowerCase("tr-TR")
      .replaceAll("ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("ş", "s")
      .replaceAll("ı", "i")
      .replaceAll("ö", "o")
      .replaceAll("ç", "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "oyuncu"
  );
}

function text(value?: string | number | null) {
  if (value == null || value === "") return "—";
  return String(value);
}

function streamUid(url?: string | null, fallbackId?: string | null) {
  if (fallbackId) return fallbackId;
  if (!url) return null;
  const match = url.match(/cloudflarestream\.com\/([a-f0-9]+)/i);
  return match?.[1] ?? null;
}

function streamIframe(uid: string) {
  const host =
    process.env.NEXT_PUBLIC_CF_CUSTOMER_SUBDOMAIN ??
    "customer.cloudflarestream.com";
  return `https://${host}/${uid}/iframe`;
}

function streamMp4(uid: string) {
  const host =
    process.env.NEXT_PUBLIC_CF_CUSTOMER_SUBDOMAIN ??
    "customer.cloudflarestream.com";
  return `https://${host}/${uid}/downloads/default.mp4`;
}

async function fetchBytes(url: string, timeoutMs = 20000): Promise<Uint8Array | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
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

function row(name: string, value: string) {
  return `<tr><th>${escapeHtml(name)}</th><td>${escapeHtml(value)}</td></tr>`;
}

function section(title: string, rows: string) {
  return `<section><h2>${escapeHtml(title)}</h2><table>${rows}</table></section>`;
}

export function actorExportSlug(profile: Profile) {
  return slugify(profile.full_name || profile.email || profile.id);
}

export async function buildActorExportZip(input: ExportInput): Promise<Buffer> {
  const { profile, actor, photos, videos } = input;
  const zip = new JSZip();
  const age = ageFromBirth(actor?.birth_date);

  const photoFiles: { caption: string; file: string; remote: string }[] = [];

  const pushPhoto = async (caption: string, file: string, url?: string | null) => {
    if (!url) return;
    const remote = displayImageUrl(url, 2000) ?? url;
    const bytes = await fetchBytes(remote);
    if (bytes) zip.file(`fotograflar/${file}`, bytes);
    photoFiles.push({ caption, file, remote });
  };

  await pushPhoto("Profil", "profil.jpg", profile.avatar_url);
  await pushPhoto("Kapak", "kapak.jpg", profile.cover_url);
  for (const photo of photos) {
    const caption = label(PHOTO_KIND, photo.kind);
    const file = `${slugify(photo.kind || "foto")}.jpg`;
    await pushPhoto(caption, file, photo.public_url);
  }

  const videoSlots = [
    {
      kind: "intro",
      label: "Tanıtım",
      id: actor?.intro_video_id,
      url: actor?.intro_video_playback_url,
    },
    {
      kind: "mimic",
      label: "Mimik",
      id: actor?.mimic_video_id,
      url: actor?.mimic_video_playback_url,
    },
    {
      kind: "showreel",
      label: "Showreel",
      id: actor?.showreel_video_id,
      url: actor?.showreel_playback_url,
    },
    {
      kind: "talent",
      label: "Yetenek",
      id: actor?.talent_video_id,
      url: actor?.talent_video_playback_url,
    },
  ];

  const seen = new Set(videoSlots.map((v) => v.kind));
  for (const video of videos) {
    const kind = (video.kind ?? "").toLowerCase();
    if (!kind || seen.has(kind) || video.status !== "ready" || !video.playback_url) continue;
    seen.add(kind);
    videoSlots.push({
      kind,
      label: label(VIDEO_KIND, kind),
      id: null,
      url: video.playback_url,
    });
  }

  const videoFiles: { label: string; file: string | null; iframe: string | null }[] = [];
  for (const slot of videoSlots) {
    const uid = streamUid(slot.url, slot.id);
    if (!uid && !slot.url) {
      videoFiles.push({ label: slot.label, file: null, iframe: null });
      continue;
    }
    const file = `${slugify(slot.kind)}.mp4`;
    let saved = false;
    if (uid) {
      const bytes = await fetchBytes(streamMp4(uid), 45000);
      if (bytes && bytes.byteLength > 1000) {
        zip.file(`videolar/${file}`, bytes);
        saved = true;
      }
    }
    videoFiles.push({
      label: slot.label,
      file: saved ? file : null,
      iframe: uid ? streamIframe(uid) : null,
    });
  }

  const kimlik = [
    row("Ad soyad", text(profile.full_name)),
    row("E-posta", text(profile.email)),
    row("Durum", label(ACTOR_STATUS, profile.actor_status)),
    row("Telefon", text(profile.phone)),
    row("Yakın telefonu", text(actor?.relative_phone)),
    row("WhatsApp", text(actor?.whatsapp)),
    row("TCKN", text(actor?.national_id)),
    row("Uyruk", `${countryLabel(actor?.nationality)}${actor?.nationality ? ` (${actor.nationality})` : ""}`),
    row("Doğum", `${formatDate(actor?.birth_date)} (${age ?? "—"} yaş)`),
    row("Doğum yeri", text(actor?.birth_place)),
    row("Cinsiyet", label(GENDER, actor?.gender)),
    row("Şehir", text(actor?.city)),
    row("Adres", text(actor?.address)),
    row("Instagram", text(actor?.instagram)),
    row("Kayıt tarihi", formatDate(actor?.registration_date)),
  ].join("");

  const fiziksel = [
    row("Boy", text(actor?.height_cm)),
    row("Kilo", text(actor?.weight_kg)),
    row("Saç", label(HAIR, actor?.hair_color)),
    row("Göz", label(EYES, actor?.eye_color)),
    row("Tişört", text(actor?.tshirt_size)),
    row("Pantolon", text(actor?.pants_size)),
    row("Takım", text(actor?.suit_size)),
    row("Ayakkabı", text(actor?.shoe_size)),
    row("Beden", text(actor?.body_size)),
  ].join("");

  const kariyer = [
    row("Eğitim", text(actor?.education)),
    row("Meslek", text(actor?.profession)),
    row("Oyunculuk eğitimi", text(actor?.acting_education)),
    row("Deneyim", text(actor?.experience)),
    row("Diller", formatLanguages(actor?.languages)),
    row("Aksan", text(actor?.accents)),
    row("Enstrüman", text(actor?.instruments)),
    row("Müsaitlik", text(actor?.availability)),
    row("Diğer ajans", text(actor?.other_agency)),
    row("Referans", text(actor?.referral_source)),
  ].join("");

  const yetenek = [
    row("Spor", listLabel(SPORTS, actor?.sports)),
    row("Dans", listLabel(DANCES, actor?.dances)),
    row("Dans diğer", text(actor?.dances_other)),
    row("Model", actor?.model_skills?.join(", ") || "—"),
    row("Performans", actor?.performance_skills?.join(", ") || "—"),
    row("Özel durum", actor?.special_conditions?.join(", ") || "—"),
    row("Ehliyet", text(actor?.driving_info)),
    row("İlgi", text(actor?.special_interests)),
    row("Not", text(actor?.additional_notes)),
  ].join("");

  const evrak = [
    row("Hesap adı", text(actor?.bank_account_name)),
    row("Banka", text(actor?.bank_name)),
    row("IBAN", text(actor?.iban)),
    row("Pasaport", boolLabel(actor?.has_passport)),
    row("Pasaport no", text(actor?.passport_no)),
    row("Pasaport tipi", text(actor?.passport_type)),
    row("Vize", text(actor?.visa_countries)),
    row("Çalışma izni", boolLabel(actor?.has_work_permit)),
    row("İkamet", boolLabel(actor?.has_residence_permit)),
    row("KVKK", boolLabel(actor?.kvkk_accepted)),
  ].join("");

  const photoHtml = photoFiles.length
    ? photoFiles
        .map(
          (p) => `<figure>
            <img src="fotograflar/${escapeHtml(p.file)}" alt="${escapeHtml(p.caption)}" onerror="this.src='${escapeHtml(p.remote)}'" />
            <figcaption>${escapeHtml(p.caption)}</figcaption>
          </figure>`
        )
        .join("")
    : "<p>Fotoğraf yok.</p>";

  const videoHtml = videoFiles
    .map((v) => {
      if (v.file) {
        return `<figure>
          <video src="videolar/${escapeHtml(v.file)}" controls></video>
          <figcaption>${escapeHtml(v.label)}</figcaption>
        </figure>`;
      }
      if (v.iframe) {
        return `<figure>
          <iframe src="${escapeHtml(v.iframe)}" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen></iframe>
          <figcaption>${escapeHtml(v.label)}</figcaption>
        </figure>`;
      }
      return `<p>${escapeHtml(v.label)}: yok</p>`;
    })
    .join("");

  const name = profile.full_name || "Oyuncu";
  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(name)} — Rüzgâr Ajans</title>
  <style>
    body { font-family: Georgia, serif; background: #f4efe6; color: #1a1a1a; margin: 0; padding: 32px; }
    h1 { font-size: 32px; margin: 0 0 4px; }
    .meta { color: #666; margin-bottom: 28px; }
    h2 { font-size: 20px; border-bottom: 1px solid #d8d0c4; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #ece6dc; vertical-align: top; }
    th { width: 220px; color: #666; font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    figure { margin: 0; }
    img, video, iframe { width: 100%; height: auto; background: #fff; border-radius: 10px; }
    iframe { aspect-ratio: 16/9; border: 0; }
    video { background: #000; }
    figcaption { font-size: 13px; color: #666; margin-top: 6px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(name)}</h1>
  <p class="meta">${escapeHtml(profile.email ?? "")} · ${escapeHtml(label(ACTOR_STATUS, profile.actor_status))}</p>
  ${section("Kimlik", kimlik)}
  ${section("Fiziksel", fiziksel)}
  ${section("Kariyer", kariyer)}
  ${section("Yetenekler", yetenek)}
  ${section("Banka & evrak", evrak)}
  <section><h2>Fotoğraflar</h2><div class="grid">${photoHtml}</div></section>
  <section><h2>Videolar</h2><div class="grid">${videoHtml}</div></section>
</body>
</html>`;

  zip.file("profil.html", html);
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return Buffer.from(bytes);
}
