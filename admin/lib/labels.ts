import type { ActorStatus, ApplicationStatus } from "./types";

export const ACTOR_STATUS: Record<ActorStatus, string> = {
  pending: "Onay bekliyor",
  approved: "Onaylı",
  rejected: "Reddedildi",
};

export const APP_STATUS: Record<ApplicationStatus, string> = {
  submitted: "Gönderildi",
  under_review: "İnceleniyor",
  shortlisted: "Kısa liste",
  audition_invited: "Audition daveti",
  accepted: "Kabul",
  rejected: "Red",
};

export const GENDER: Record<string, string> = {
  female: "Kadın",
  male: "Erkek",
  any: "Fark etmez",
  non_binary: "Non-binary",
};

export const HAIR: Record<string, string> = {
  black: "Siyah",
  dark_brown: "Koyu kahve",
  brown: "Kahverengi",
  light_brown: "Açık kahve",
  blonde: "Sarı",
  dark_blonde: "Koyu sarı",
  red: "Kızıl",
  auburn: "Kumral kızıl",
  gray: "Gri",
  white: "Beyaz",
  other: "Diğer",
};

export const EYES: Record<string, string> = {
  brown: "Kahverengi",
  dark_brown: "Koyu kahve",
  hazel: "Ela",
  green: "Yeşil",
  blue: "Mavi",
  gray: "Gri",
  black: "Siyah",
  other: "Diğer",
};

export const PHOTO_KIND: Record<string, string> = {
  full_body: "Boydan",
  chest: "Göğüs plan",
  profile_right: "Sağ profil",
  profile_left: "Sol profil",
  model_pose: "Model pozu",
  hands: "El",
};

export const VIDEO_KIND: Record<string, string> = {
  intro: "Tanıtım",
  mimic: "Mimik",
  showreel: "Showreel",
  talent: "Yetenek",
  audition: "Audition",
  promo: "Promo",
};

export const SPORTS: Record<string, string> = {
  action: "Aksiyon",
  horse_riding: "At biniciliği",
  weapons: "Silah",
  scuba: "Dalış",
  cycling: "Bisiklet",
  skateboard: "Kaykay",
  skating: "Paten",
  archery: "Okçuluk",
  fencing: "Eskrim",
  sword: "Kılıç",
  yoga: "Yoga",
  fitness: "Fitness",
  boxing: "Boks",
  football: "Futbol",
  volleyball: "Voleybol",
  basketball: "Basketbol",
  swimming: "Yüzme",
  athletics: "Atletizm",
  gymnastics: "Jimnastik",
  pilates: "Pilates",
  karate: "Karate",
  kickboxing: "Kick boks",
  judo: "Judo",
  taekwondo: "Taekwondo",
  parkour: "Parkur",
  stunt: "Dublör",
  none: "Yok",
};

export const DANCES: Record<string, string> = {
  latin: "Latin",
  tango: "Tango",
  belly: "Oryantal",
  hiphop: "Hiphop",
  ballet: "Bale",
  modern: "Modern",
  folklore: "Folklor",
  other: "Diğer",
  none: "Yok",
};

export function label(map: Record<string, string>, key?: string | null) {
  if (!key) return "—";
  return map[key] ?? key;
}

export function listLabel(map: Record<string, string>, keys?: string[] | null) {
  if (!keys?.length) return "—";
  return keys.map((k) => map[k] ?? k).join(", ");
}

export function ageFromBirth(birth?: string | null) {
  if (!birth) return null;
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("tr-TR");
}

export function formatMoney(amount?: number | null, currency = "TRY") {
  if (amount == null) return "—";
  return `${amount.toLocaleString("tr-TR")} ${currency}`;
}

export function boolLabel(v?: boolean | null) {
  if (v == null) return "—";
  return v ? "Evet" : "Hayır";
}
