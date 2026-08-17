export const LANGUAGE_CODES = [
  'tr', 'en', 'de', 'fr', 'es', 'it', 'ru', 'ar', 'ku', 'az', 'fa', 'nl', 'pt',
  'zh', 'ja', 'ko', 'el', 'bg', 'ro', 'pl', 'uk', 'sv', 'no', 'da', 'fi', 'hu',
  'cs', 'sk', 'hr', 'sr', 'bs', 'sq', 'mk', 'sl', 'he', 'hy', 'ka', 'hi', 'ur',
  'bn', 'th', 'vi', 'id', 'ms', 'sw', 'am', 'so', 'ha', 'yo', 'ig', 'zu', 'af',
  'ca', 'eu', 'gl', 'cy', 'ga', 'is', 'lt', 'lv', 'et', 'mt', 'lb', 'be', 'kk',
  'uz', 'tk', 'ky', 'tg', 'mn', 'ne', 'si', 'ta', 'te', 'ml', 'kn', 'gu', 'pa',
  'mr', 'my', 'km', 'lo', 'sgn',
] as const;

const LANGUAGE_NAMES_TR: Record<string, string> = {
  "tr": "Türkçe",
  "en": "İngilizce",
  "de": "Almanca",
  "fr": "Fransızca",
  "es": "İspanyolca",
  "it": "İtalyanca",
  "ru": "Rusça",
  "ar": "Arapça",
  "ku": "Kürtçe",
  "az": "Azerice",
  "fa": "Farsça",
  "nl": "Hollandaca",
  "pt": "Portekizce",
  "zh": "Çince",
  "ja": "Japonca",
  "ko": "Korece",
  "el": "Yunanca",
  "bg": "Bulgarca",
  "ro": "Rumence",
  "pl": "Lehçe",
  "uk": "Ukraynaca",
  "sv": "İsveççe",
  "no": "Norveççe",
  "da": "Danca",
  "fi": "Fince",
  "hu": "Macarca",
  "cs": "Çekçe",
  "sk": "Slovakça",
  "hr": "Hırvatça",
  "sr": "Sırpça",
  "bs": "Boşnakça",
  "sq": "Arnavutça",
  "mk": "Makedonca",
  "sl": "Slovence",
  "he": "İbranice",
  "hy": "Ermenice",
  "ka": "Gürcüce",
  "hi": "Hintçe",
  "ur": "Urduca",
  "bn": "Bengalce",
  "th": "Tayca",
  "vi": "Vietnamca",
  "id": "Endonezce",
  "ms": "Malayca",
  "sw": "Svahili",
  "am": "Amharca",
  "so": "Somalice",
  "ha": "Hausa dili",
  "yo": "Yorubaca",
  "ig": "İbo dili",
  "zu": "Zuluca",
  "af": "Afrikaanca",
  "ca": "Katalanca",
  "eu": "Baskça",
  "gl": "Galiçyaca",
  "cy": "Galce",
  "ga": "İrlandaca",
  "is": "İzlandaca",
  "lt": "Litvanca",
  "lv": "Letonca",
  "et": "Estonca",
  "mt": "Maltaca",
  "lb": "Lüksemburgca",
  "be": "Belarusça",
  "kk": "Kazakça",
  "uz": "Özbekçe",
  "tk": "Türkmence",
  "ky": "Kırgızca",
  "tg": "Tacikçe",
  "mn": "Moğolca",
  "ne": "Nepalce",
  "si": "Sinhali dili",
  "ta": "Tamilce",
  "te": "Telugu dili",
  "ml": "Malayalam dili",
  "kn": "Kannada dili",
  "gu": "Güceratça",
  "pa": "Pencapça",
  "mr": "Marathi dili",
  "my": "Birman dili",
  "km": "Khmer dili",
  "lo": "Lao dili",
  "sgn": "İşaret dili",
};

const LANGUAGE_NAMES_EN: Record<string, string> = {
  "tr": "Turkish",
  "en": "English",
  "de": "German",
  "fr": "French",
  "es": "Spanish",
  "it": "Italian",
  "ru": "Russian",
  "ar": "Arabic",
  "ku": "Kurdish",
  "az": "Azerbaijani",
  "fa": "Persian",
  "nl": "Dutch",
  "pt": "Portuguese",
  "zh": "Chinese",
  "ja": "Japanese",
  "ko": "Korean",
  "el": "Greek",
  "bg": "Bulgarian",
  "ro": "Romanian",
  "pl": "Polish",
  "uk": "Ukrainian",
  "sv": "Swedish",
  "no": "Norwegian",
  "da": "Danish",
  "fi": "Finnish",
  "hu": "Hungarian",
  "cs": "Czech",
  "sk": "Slovak",
  "hr": "Croatian",
  "sr": "Serbian",
  "bs": "Bosnian",
  "sq": "Albanian",
  "mk": "Macedonian",
  "sl": "Slovenian",
  "he": "Hebrew",
  "hy": "Armenian",
  "ka": "Georgian",
  "hi": "Hindi",
  "ur": "Urdu",
  "bn": "Bangla",
  "th": "Thai",
  "vi": "Vietnamese",
  "id": "Indonesian",
  "ms": "Malay",
  "sw": "Swahili",
  "am": "Amharic",
  "so": "Somali",
  "ha": "Hausa",
  "yo": "Yoruba",
  "ig": "Igbo",
  "zu": "Zulu",
  "af": "Afrikaans",
  "ca": "Catalan",
  "eu": "Basque",
  "gl": "Galician",
  "cy": "Welsh",
  "ga": "Irish",
  "is": "Icelandic",
  "lt": "Lithuanian",
  "lv": "Latvian",
  "et": "Estonian",
  "mt": "Maltese",
  "lb": "Luxembourgish",
  "be": "Belarusian",
  "kk": "Kazakh",
  "uz": "Uzbek",
  "tk": "Turkmen",
  "ky": "Kyrgyz",
  "tg": "Tajik",
  "mn": "Mongolian",
  "ne": "Nepali",
  "si": "Sinhala",
  "ta": "Tamil",
  "te": "Telugu",
  "ml": "Malayalam",
  "kn": "Kannada",
  "gu": "Gujarati",
  "pa": "Punjabi",
  "mr": "Marathi",
  "my": "Burmese",
  "km": "Khmer",
  "lo": "Lao",
  "sgn": "Sign language",
};

export const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native'] as const;

export type LanguageSkill = { code: string; level: string };

export function languageLabel(code?: string | null, locale = 'tr'): string {
  if (!code) return '—';
  const id = code.toLowerCase();
  const names = locale.startsWith('tr') ? LANGUAGE_NAMES_TR : LANGUAGE_NAMES_EN;
  return names[id] ?? id;
}

export function languageOptions(locale = 'tr'): { id: string; label: string }[] {
  const lang = locale.startsWith('tr') ? 'tr' : 'en';
  const pinned = new Set(['tr', 'en', 'de', 'fr', 'ar', 'ru', 'ku']);
  const seen = new Set<string>();
  return LANGUAGE_CODES.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  })
    .map((id) => ({ id, label: languageLabel(id, lang) }))
    .sort((a, b) => {
      const ap = pinned.has(a.id) ? 0 : 1;
      const bp = pinned.has(b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return a.label.localeCompare(b.label, lang);
    });
}

export function parseLanguageSkills(raw?: string[] | null): LanguageSkill[] {
  const rows = (raw ?? [])
    .map((item) => {
      const value = item.trim();
      if (!value) return null;
      const sep = value.lastIndexOf(':');
      if (sep <= 0) return { code: value.toLowerCase(), level: '' };
      return {
        code: value.slice(0, sep).trim().toLowerCase(),
        level: value.slice(sep + 1).trim(),
      };
    })
    .filter((row): row is LanguageSkill => Boolean(row));
  return rows.length ? rows : [{ code: '', level: '' }];
}

export function serializeLanguageSkills(rows: LanguageSkill[]): string[] {
  return rows
    .filter((row) => row.code && row.level)
    .map((row) => `${row.code}:${row.level}`);
}

export function formatLanguageSkills(raw?: string[] | null, locale = 'tr'): string {
  const rows = parseLanguageSkills(raw).filter((row) => row.code);
  if (!rows.length) return '—';
  return rows
    .map((row) => {
      const name = languageLabel(row.code, locale);
      return row.level ? `${name} ${row.level}` : name;
    })
    .join(', ');
}

