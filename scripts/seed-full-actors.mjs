/**
 * Create a few approved actors with every registration field filled.
 * Usage: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, then:
 *   node scripts/seed-full-actors.mjs
 */

const URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SRK) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const PASSWORD = "Test12345";
const now = new Date().toISOString();

const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  "Content-Type": "application/json",
};

async function api(path, options = {}) {
  const res = await fetch(`${URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${options.method || "GET"} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function findUserByEmail(email) {
  const data = await api("/auth/v1/admin/users?page=1&per_page=200");
  return (data.users || []).find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
}

async function ensureUser({ email, fullName, phone }) {
  let user = await findUserByEmail(email);
  if (!user) {
    user = await api("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone, role: "actor" },
      }),
    });
    console.log("created", email);
  } else {
    console.log("exists", email);
  }

  await api(`/rest/v1/profiles?id=eq.${user.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      email,
      full_name: fullName,
      phone,
      role: "actor",
      locale: "tr",
    }),
  });

  return user;
}

async function upsertActorProfile(userId, profile) {
  await api("/rest/v1/actor_profiles", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, ...profile }),
  });
}

const ACTORS = [
  {
    email: "selin.arslan@ruzgar.test",
    fullName: "Selin Arslan",
    phone: "05321110101",
    profile: {
      bio: "Dizi ve reklam deneyimli, kamera karşısında doğal duran oyuncu. İstanbul merkezli.",
      height_cm: 172,
      weight_kg: 56,
      birth_date: "1996-03-14",
      hair_color: "brown",
      eye_color: "green",
      shoe_size: "38",
      body_size: "S",
      tshirt_size: "S",
      pants_size: "36",
      suit_size: "44",
      education: "bachelor",
      profession: "actor",
      acting_education: "MSGSÜ Konservatuvar, tiyatro bölümü",
      experience: "Netflix yan rol, 4 ulusal reklam, 2 tiyatro oyunu",
      languages: ["tr:native", "en:C1", "fr:B2"],
      skills: ["Doğaçlama", "Kamera oyunu", "Dans"],
      gender: "female",
      city: "İstanbul",
      national_id: "10000000101",
      is_turkish_citizen: true,
      nationality: "TR",
      birth_place: "İzmir",
      whatsapp: "05321110101",
      relative_phone: "05321110102",
      address: "Caddebostan Mah. Bağdat Cad. No:128, Kadıköy / İstanbul",
      registration_date: "2026-02-10",
      instagram: "selin.arslan.actor",
      bank_account_name: "Selin Arslan",
      bank_name: "Garanti BBVA",
      iban: "TR330006100519786457841326",
      has_passport: true,
      passport_no: "U23876154",
      passport_type: "ordinary",
      visa_countries: "Schengen, İngiltere",
      has_work_permit: true,
      has_residence_permit: true,
      employment_status: ["freelancer"],
      insurance_status: "eligible_sgk",
      insurance_other: "SGK primi güncel, günlük sigorta yapılabilir",
      sports: ["yoga", "swimming", "fitness", "pilates"],
      dances: ["modern", "latin", "other"],
      dances_other: "Salsa",
      model_skills: ["photo", "fashion"],
      model_other: "Katalog çekimi",
      performance_skills: ["improv", "dubbing", "presenter"],
      performance_other: "Sunuculuk deneyimi",
      special_conditions: [],
      accents: "İstanbul, Ege",
      instruments: "Piyano, ukulele",
      additional_notes: "Kamera ve stüdyo kayıtlarına alışkın. Kısa sürede seyahat edebilir.",
      driving_info: "B sınıfı ehliyet, 7 yıl, otomatik / manuel",
      availability: "Hafta içi akşam, hafta sonu tam gün. 48 saat içinde sette olabilir.",
      other_agency: "Yok",
      referral_source: "Instagram / ajans duyurusu",
      special_interests: "Fotoğraf, çağdaş dans, senaryo okuma",
      kvkk_accepted: true,
      form_saved_at: now,
      media_saved_at: now,
      registration_completed_at: now,
    },
  },
  {
    email: "burak.sahin@ruzgar.test",
    fullName: "Burak Şahin",
    phone: "05321110202",
    profile: {
      bio: "Aksiyon ve drama rollerine yatkın, dövüş koreografisi bilen oyuncu.",
      height_cm: 184,
      weight_kg: 81,
      birth_date: "1993-08-21",
      hair_color: "black",
      eye_color: "brown",
      shoe_size: "44",
      body_size: "L",
      tshirt_size: "L",
      pants_size: "42",
      suit_size: "52",
      education: "master",
      profession: "actor",
      acting_education: "Hacettepe DTCF Tiyatro, yüksek lisans",
      experience: "TRT dizi yan rol, 6 reklam, 1 uzun metraj kısa rol",
      languages: ["tr:native", "en:B2", "de:B1"],
      skills: ["Dövüş", "Sürüş", "Seslendirme"],
      gender: "male",
      city: "Ankara",
      national_id: "10000000202",
      is_turkish_citizen: true,
      nationality: "TR",
      birth_place: "Ankara",
      whatsapp: "05321110202",
      relative_phone: "05321110203",
      address: "Çankaya, Bestekar Sok. No:14, Ankara",
      registration_date: "2026-01-28",
      instagram: "buraksahin.official",
      bank_account_name: "Burak Şahin",
      bank_name: "İş Bankası",
      iban: "TR120006400000112233445566",
      has_passport: true,
      passport_no: "U55190227",
      passport_type: "ordinary",
      visa_countries: "Schengen, ABD B1/B2",
      has_work_permit: true,
      has_residence_permit: true,
      employment_status: ["private_sector", "freelancer"],
      insurance_status: "eligible",
      insurance_other: "Günlük sigorta için evrak hazır",
      sports: ["boxing", "fitness", "swimming", "horse_riding", "stunt"],
      dances: ["hiphop"],
      dances_other: "",
      model_skills: ["photo"],
      model_other: "",
      performance_skills: ["improv", "dubbing", "imitation"],
      performance_other: "Aksiyon dublörlük temel eğitim",
      special_conditions: [],
      accents: "Ankara, Karadeniz",
      instruments: "Gitar, davul",
      additional_notes: "Motosiklet ve otomobil sahnelerine uygun. Gece çekimine açık.",
      driving_info: "B ve A2 ehliyet, motosiklet 5 yıl",
      availability: "Tam zamanlı, Türkiye içi seyahat serbest",
      other_agency: "Freelance, bağlı ajans yok",
      referral_source: "Oyuncu arkadaşı tavsiyesi",
      special_interests: "Dövüş sanatları, motosiklet, sinema tarihi",
      kvkk_accepted: true,
      form_saved_at: now,
      media_saved_at: now,
      registration_completed_at: now,
    },
  },
  {
    email: "nisa.koc@ruzgar.test",
    fullName: "Nisa Koç",
    phone: "05321110303",
    profile: {
      bio: "Gençlik dizileri, moda filmleri ve marka işlerine uygun, kamera alışkanlığı yüksek.",
      height_cm: 168,
      weight_kg: 52,
      birth_date: "2000-11-02",
      hair_color: "blonde",
      eye_color: "blue",
      shoe_size: "37",
      body_size: "XS",
      tshirt_size: "XS",
      pants_size: "34",
      suit_size: "44",
      education: "associate",
      profession: "model",
      acting_education: "Özel oyunculuk atölyesi + kamera oyunu sertifikası",
      experience: "8 reklam, 1 web dizi başrol, defile ve katalog",
      languages: ["tr:native", "en:C2", "it:B1"],
      skills: ["Mankenlik", "Kamera", "Dans"],
      gender: "female",
      city: "İzmir",
      national_id: "10000000303",
      is_turkish_citizen: true,
      nationality: "TR",
      birth_place: "Muğla",
      whatsapp: "05321110303",
      relative_phone: "05321110304",
      address: "Alsancak, Kıbrıs Şehitleri Cad. No:56, İzmir",
      registration_date: "2026-03-04",
      instagram: "nisakoc",
      bank_account_name: "Nisa Koç",
      bank_name: "Yapı Kredi",
      iban: "TR650006701000000012345678",
      has_passport: true,
      passport_no: "U77441903",
      passport_type: "ordinary",
      visa_countries: "Schengen, İngiltere, BAE",
      has_work_permit: true,
      has_residence_permit: true,
      employment_status: ["freelancer"],
      insurance_status: "eligible_sgk",
      insurance_other: "Bağkur kayıtlı, günlük sigorta uygun",
      sports: ["yoga", "pilates", "athletics", "swimming"],
      dances: ["ballet", "modern", "hiphop"],
      dances_other: "",
      model_skills: ["photo", "fashion", "hand", "foot"],
      model_other: "Ürün ve el-ayak çekimleri",
      performance_skills: ["presenter", "improv"],
      performance_other: "Marka yüzü / lansman sunumu",
      special_conditions: [],
      accents: "Ege, İstanbul",
      instruments: "Keman",
      additional_notes: "Saç rengi doğal sarı. Makyajsız çekime uygun. Hızlı ezber.",
      driving_info: "B sınıfı ehliyet, 3 yıl",
      availability: "İzmir / İstanbul, 24 saat içinde uçakla gelebilir",
      other_agency: "Daha önce bir mankenlik ajansıyla çalıştı, sözleşme bitti",
      referral_source: "Casting director tavsiyesi",
      special_interests: "Moda, keman, çağdaş sanat",
      kvkk_accepted: true,
      form_saved_at: now,
      media_saved_at: now,
      registration_completed_at: now,
    },
  },
];

async function main() {
  for (const a of ACTORS) {
    const user = await ensureUser({
      email: a.email,
      fullName: a.fullName,
      phone: a.phone,
    });
    await upsertActorProfile(user.id, a.profile);
    console.log("filled", a.fullName);
  }
  console.log("ok", ACTORS.length, "profiles");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
