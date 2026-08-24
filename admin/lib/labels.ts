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

export const PASSPORT_TYPE: Record<string, string> = {
  ordinary: "Umuma mahsus (bordo)",
  special: "Hususi (yeşil)",
  service: "Hizmet (gri)",
  diplomatic: "Diplomatik (siyah)",
  foreign: "Yabancı ülke pasaportu",
};

export const EDUCATION: Record<string, string> = {
  primary: "İlkokul",
  middle: "Ortaokul",
  high_school: "Lise",
  associate: "Ön lisans",
  bachelor: "Lisans",
  master: "Yüksek lisans",
  doctorate: "Doktora",
  other: "Diğer",
};

export const PROFESSION: Record<string, string> = {
  actor: "Oyuncu",
  model: "Model",
  student: "Öğrenci",
  teacher: "Öğretmen",
  engineer: "Mühendis",
  doctor: "Doktor",
  nurse: "Hemşire",
  lawyer: "Avukat",
  architect: "Mimar",
  designer: "Tasarımcı",
  musician: "Müzisyen",
  dancer: "Dansçı",
  athlete: "Sporcu",
  freelancer: "Serbest meslek",
  private_sector: "Özel sektör",
  public_sector: "Kamu",
  homemaker: "Ev hanımı / ev erkeği",
  unemployed: "Çalışmıyor",
  retired: "Emekli",
  other: "Diğer",
};

export const MODEL: Record<string, string> = {
  hand: "El modeli",
  foot: "Ayak modeli",
  photo: "Fotomodel",
  fashion: "Manken",
  other: "Diğer",
};

export const PERFORMANCE: Record<string, string> = {
  presenter: "Sunuculuk / spikerlik",
  dubbing: "Dublaj",
  pantomime: "Pandomim",
  imitation: "Taklit",
  improv: "Doğaçlama tiyatro",
  fire: "Ateşbaz",
  stilts: "Tahtabacak",
  pole: "Direk dansı",
  circus: "Sirk sanatçısı",
  juggler: "Jonklör",
  clown: "Palyaço",
};

export const SPECIAL: Record<string, string> = {
  twin: "İkiz",
  triplet: "Üçüz",
  quadruplet: "Dördüz",
  prosthetic_leg: "Protez bacak",
  down_syndrome: "Down sendromu",
  physical_condition: "Fiziksel özel durum",
  large_scar: "Büyük yara izi",
  dwarfism: "Cüce",
  albino: "Albino",
  vitiligo: "Vitiligo",
};

export const INSURANCE: Record<string, string> = {
  eligible: "Yapılabilir",
  eligible_sgk: "Yapılabilir — SGK'lı olarak çalışıyor",
  eligible_retired: "Yapılabilir — Emekli",
  unemployment: "İşsizlik maaşı alıyor",
  student_grant: "Geri ödemesiz öğrenci kredisi alıyor",
  ineligible_other: "Yapılamaz — diğer",
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

export function formatLanguages(raw?: string[] | null) {
  if (!raw?.length) return "—";
  return raw
    .map((item) => {
      const sep = item.lastIndexOf(":");
      if (sep <= 0) return item;
      const code = item.slice(0, sep);
      const level = item.slice(sep + 1);
      let name = code;
      try {
        name = new Intl.DisplayNames(["tr"], { type: "language" }).of(code) ?? code;
      } catch {
        name = code === "sgn" ? "İşaret dili" : code;
      }
      if (code === "sgn") name = "İşaret dili";
      const levelLabel = level === "native" ? "Anadil" : level;
      return `${name} ${levelLabel}`.trim();
    })
    .join(", ");
}

export function countryLabel(code?: string | null) {
  if (!code) return "—";
  try {
    return new Intl.DisplayNames(["tr"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
