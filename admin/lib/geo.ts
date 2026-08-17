import { countryLabel } from "@/lib/labels";

export const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU",
  "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL",
  "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC",
  "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV",
  "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG",
  "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD",
  "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT",
  "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM",
  "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH",
  "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK",
  "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH",
  "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW",
  "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR",
  "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR",
  "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC",
  "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL",
  "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY",
  "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA",
  "ZM", "ZW",
] as const;

export const LANGUAGE_CODES = [
  "tr", "en", "de", "fr", "es", "it", "ru", "ar", "ku", "az", "fa", "nl", "pt",
  "zh", "ja", "ko", "el", "bg", "ro", "pl", "uk", "sv", "no", "da", "fi", "hu",
  "cs", "sk", "hr", "sr", "bs", "sq", "mk", "sl", "he", "hy", "ka", "hi", "ur",
  "bn", "th", "vi", "id", "ms", "sw", "am", "so", "ha", "yo", "ig", "zu", "af",
  "ca", "eu", "gl", "cy", "ga", "is", "lt", "lv", "et", "mt", "lb", "be", "kk",
  "uz", "tk", "ky", "tg", "mn", "ne", "si", "ta", "te", "ml", "kn", "gu", "pa",
  "mr", "my", "km", "lo", "sgn",
] as const;

export function languageName(code?: string | null) {
  if (!code) return "";
  if (code === "sgn") return "İşaret dili";
  try {
    return new Intl.DisplayNames(["tr"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function countryOptions() {
  return COUNTRY_CODES.map((id) => ({ id, label: countryLabel(id) })).sort((a, b) => {
    if (a.id === "TR") return -1;
    if (b.id === "TR") return 1;
    return a.label.localeCompare(b.label, "tr");
  });
}

export function languageOptions() {
  const pinned = new Set(["tr", "en", "de", "fr", "ar", "ru", "ku"]);
  return LANGUAGE_CODES.map((id) => ({ id, label: languageName(id) })).sort((a, b) => {
    const ap = pinned.has(a.id) ? 0 : 1;
    const bp = pinned.has(b.id) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return a.label.localeCompare(b.label, "tr");
  });
}

export function formatCountryList(codes?: string[] | null) {
  if (!codes?.length) return "";
  return codes.map((code) => countryLabel(code)).filter((name) => name && name !== "—").join(", ");
}

export function formatLanguageList(codes?: string[] | null) {
  if (!codes?.length) return "";
  return codes.map((code) => languageName(code)).filter(Boolean).join(", ");
}
