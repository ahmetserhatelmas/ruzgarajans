/**
 * Seed fake actors, casts, applications, announcements.
 * Usage: node scripts/seed-fake-data.mjs
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars.
 */

const URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SRK) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const PASSWORD = 'Test12345';
const ADMIN_EMAIL = 'ahmetserhatelmas@gmail.com';

const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
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
    throw new Error(`${options.method || 'GET'} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function findUserByEmail(email) {
  const data = await api('/auth/v1/admin/users?page=1&per_page=200');
  return (data.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
}

async function ensureUser({ email, fullName, phone, role = 'actor' }) {
  let user = await findUserByEmail(email);
  if (!user) {
    user = await api('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone, role },
      }),
    });
    console.log('created auth user', email);
  } else {
    console.log('auth user exists', email);
  }

  await api(`/rest/v1/profiles?id=eq.${user.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      email,
      full_name: fullName,
      phone,
      role,
      actor_status: 'approved',
      locale: 'tr',
    }),
  });

  return user;
}

async function upsertActorProfile(userId, profile) {
  await api('/rest/v1/actor_profiles', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: userId, ...profile }),
  });
}

const ACTORS = [
  {
    email: 'elif.yilmaz@ruzgar.test',
    fullName: 'Elif Yılmaz',
    phone: '05320000001',
    profile: {
      bio: 'Tiyatro ve dizi deneyimli oyuncu. İstanbul merkezli.',
      height_cm: 170,
      weight_kg: 55,
      birth_date: '1998-04-12',
      hair_color: 'Kahverengi',
      eye_color: 'Yeşil',
      shoe_size: '38',
      body_size: 'S',
      education: 'MSGSÜ Tiyatro',
      experience: 'Netflix dizisi cameo, 3 tiyatro oyunu',
      languages: ['Türkçe', 'İngilizce'],
      skills: ['Dans', 'Şarkı', 'Doğaçlama'],
      gender: 'female',
      city: 'İstanbul',
    },
  },
  {
    email: 'can.demir@ruzgar.test',
    fullName: 'Can Demir',
    phone: '05320000002',
    profile: {
      bio: 'Aksiyon ve drama rollerine yatkın.',
      height_cm: 182,
      weight_kg: 78,
      birth_date: '1995-09-03',
      hair_color: 'Siyah',
      eye_color: 'Kahverengi',
      shoe_size: '43',
      body_size: 'L',
      education: 'Özel oyunculuk atölyeleri',
      experience: 'Reklam filmleri, kısa filmler',
      languages: ['Türkçe', 'Almanca'],
      skills: ['Dövüş koreografisi', 'Sürüş'],
      gender: 'male',
      city: 'Ankara',
    },
  },
  {
    email: 'zeynep.kaya@ruzgar.test',
    fullName: 'Zeynep Kaya',
    phone: '05320000003',
    profile: {
      bio: 'Gençlik dizileri ve reklam çalışmaları.',
      height_cm: 165,
      weight_kg: 52,
      birth_date: '2001-01-22',
      hair_color: 'Sarı',
      eye_color: 'Mavi',
      shoe_size: '37',
      body_size: 'XS',
      education: 'Konservatuvar hazırlık',
      experience: '2 ulusal reklam, 1 web dizi',
      languages: ['Türkçe', 'İngilizce', 'Fransızca'],
      skills: ['Yoga', 'Piyanı'],
      gender: 'female',
      city: 'İzmir',
    },
  },
  {
    email: 'mert.ozturk@ruzgar.test',
    fullName: 'Mert Öztürk',
    phone: '05320000004',
    profile: {
      bio: 'Karakter oyunculuğu ve komedi.',
      height_cm: 175,
      weight_kg: 72,
      birth_date: '1992-11-18',
      hair_color: 'Kumral',
      eye_color: 'Ela',
      shoe_size: '42',
      body_size: 'M',
      education: 'Hacettepe Tiyatro',
      experience: 'Stand-up, tiyatro, dizi yan rol',
      languages: ['Türkçe'],
      skills: ['İmprov', 'Seslendirme'],
      gender: 'male',
      city: 'İstanbul',
    },
  },
  {
    email: 'ayse.celik@ruzgar.test',
    fullName: 'Ayşe Çelik',
    phone: '05320000005',
    profile: {
      bio: 'Period drama ve dönem dizilerine uygun tipaj.',
      height_cm: 168,
      weight_kg: 58,
      birth_date: '1990-06-08',
      hair_color: 'Siyah',
      eye_color: 'Kahverengi',
      shoe_size: '39',
      body_size: 'M',
      education: 'Ankara Devlet Konservatuvarı',
      experience: 'TRT dizileri, tiyatro turneleri',
      languages: ['Türkçe', 'Osmanlıca okuma'],
      skills: ['Binicilik', 'Klasik dans'],
      gender: 'female',
      city: 'Bursa',
    },
  },
];

const CASTS = [
  {
    project_name: 'Boğazın Öteki Yüzü',
    role_name: 'Leyla',
    role_description:
      '28-35 yaş arası, güçlü duruşlu, duygusal derinliği olan kadın karakter. İstanbul’da geçen drama dizisi başrolü.',
    age_min: 28,
    age_max: 35,
    gender: 'female',
    height_min_cm: 165,
    height_max_cm: 175,
    shoot_date: '2026-09-15',
    shoot_location: 'İstanbul',
    deadline: '2026-08-25',
    budget_amount: 45000,
    budget_currency: 'TRY',
    allow_budget_counter: true,
    is_published: true,
    dialogue_mode: 'script_tts',
    dialogue_script:
      'Sen burada olmamalısın.\nBu şehir seni yutacak.\nYine de kalmayı seçtin, değil mi?',
  },
  {
    project_name: 'Hızlı Teslimat',
    role_name: 'Kurye Ali',
    role_description:
      'Enerjik, samimi, 22-30 yaş erkek. Komedi-reklam filmi. Motosiklet kullanabilen tercihen.',
    age_min: 22,
    age_max: 30,
    gender: 'male',
    height_min_cm: 170,
    height_max_cm: 185,
    shoot_date: '2026-08-28',
    shoot_location: 'İstanbul / Kadıköy',
    deadline: '2026-08-20',
    budget_amount: 12000,
    budget_currency: 'TRY',
    allow_budget_counter: true,
    is_published: true,
    dialogue_mode: 'none',
  },
  {
    project_name: 'Kış Bahçesi',
    role_name: 'Genç Mimar',
    role_description:
      'Cinsiyet fark etmeksizin 25-32 yaş. Minimal, modern tipaj. Marka filmi için 1 günlük çekim.',
    age_min: 25,
    age_max: 32,
    gender: 'any',
    height_min_cm: 160,
    height_max_cm: 185,
    shoot_date: '2026-09-01',
    shoot_location: 'İstanbul Stüdyo',
    deadline: '2026-08-22',
    budget_amount: 8000,
    budget_currency: 'TRY',
    allow_budget_counter: false,
    is_published: true,
    dialogue_mode: 'none',
  },
  {
    project_name: 'Gölge Operasyonu',
    role_name: 'Ajan Nora',
    role_description: 'Aksiyon gerilim. 25-40 yaş kadın, atletik. Dövüş sahneleri var.',
    age_min: 25,
    age_max: 40,
    gender: 'female',
    height_min_cm: 165,
    height_max_cm: 178,
    shoot_date: '2026-10-10',
    shoot_location: 'Kapadokya / İstanbul',
    deadline: '2026-09-05',
    budget_amount: 75000,
    budget_currency: 'TRY',
    allow_budget_counter: true,
    is_published: false,
    dialogue_mode: 'none',
  },
  {
    project_name: 'Marmara Geceleri',
    role_name: 'Doktor Ece',
    role_description:
      '30–40 yaş kadın. Hastane dizisi yan rol. Soğukkanlı, kararlı tipaj. Tıbbi jargon okuması gerekiyor.',
    age_min: 30,
    age_max: 40,
    gender: 'female',
    height_min_cm: 160,
    height_max_cm: 175,
    shoot_date: '2026-09-20',
    shoot_location: 'İstanbul / Beykoz',
    deadline: '2026-09-01',
    budget_amount: 28000,
    budget_currency: 'TRY',
    allow_budget_counter: true,
    is_published: true,
    dialogue_mode: 'script_tts',
    dialogue_script: 'Hasta stabil.\nAma sen hâlâ buradasın.\nBu gece kimse çıkmayacak.',
  },
  {
    project_name: 'Son Tren',
    role_name: 'İstasyon Görevlisi',
    role_description:
      '40–55 yaş, cinsiyet fark etmez. Karakter oyuncusu. Az diyalog, güçlü mimik. Kısa film.',
    age_min: 40,
    age_max: 55,
    gender: 'any',
    height_min_cm: 155,
    height_max_cm: 185,
    shoot_date: '2026-09-08',
    shoot_location: 'Ankara Gar',
    deadline: '2026-08-28',
    budget_amount: 15000,
    budget_currency: 'TRY',
    allow_budget_counter: false,
    is_published: true,
    dialogue_mode: 'none',
  },
  {
    project_name: 'Cafe Neon',
    role_name: 'Barista Deniz',
    role_description:
      '20–27 yaş, androjen / modern tipaj. Gençlik dizisi. Samimi, hızlı konuşan, şehirli enerji.',
    age_min: 20,
    age_max: 27,
    gender: 'any',
    height_min_cm: 165,
    height_max_cm: 180,
    shoot_date: '2026-09-12',
    shoot_location: 'İstanbul / Karaköy',
    deadline: '2026-08-30',
    budget_amount: 18000,
    budget_currency: 'TRY',
    allow_budget_counter: true,
    is_published: true,
    dialogue_mode: 'none',
  },
  {
    project_name: 'Kuzey Rüzgarı',
    role_name: 'Kaptan Yusuf',
    role_description:
      '35–50 yaş erkek. Denizcilik dizisi. Sakallı tercihen, otoriter ama sıcak. Tekne sahnesi var.',
    age_min: 35,
    age_max: 50,
    gender: 'male',
    height_min_cm: 175,
    height_max_cm: 190,
    shoot_date: '2026-10-01',
    shoot_location: 'Bodrum',
    deadline: '2026-09-10',
    budget_amount: 55000,
    budget_currency: 'TRY',
    allow_budget_counter: true,
    is_published: true,
    dialogue_mode: 'script_tts',
    dialogue_script: 'Rüzgar değişti.\nBu limanda daha fazla kalamayız.\nYelkenleri hazırla.',
  },
  {
    project_name: 'Pazar Sabahı',
    role_name: 'Anne / Komşu',
    role_description:
      '45–60 yaş kadın. Reklam filmi (gıda markası). Sıcak, doğal, güler yüzlü. 1 günlük stüdyo çekimi.',
    age_min: 45,
    age_max: 60,
    gender: 'female',
    height_min_cm: 155,
    height_max_cm: 170,
    shoot_date: '2026-08-30',
    shoot_location: 'İstanbul Stüdyo',
    deadline: '2026-08-22',
    budget_amount: 10000,
    budget_currency: 'TRY',
    allow_budget_counter: false,
    is_published: true,
    dialogue_mode: 'none',
  },
  {
    project_name: 'Sessiz Tanık',
    role_name: 'Avukat Kerem',
    role_description:
      '28–38 yaş erkek. Mahkeme gerilim dizisi. Takım elbise taşıyabilen, keskin bakışlı tipaj.',
    age_min: 28,
    age_max: 38,
    gender: 'male',
    height_min_cm: 175,
    height_max_cm: 188,
    shoot_date: '2026-09-25',
    shoot_location: 'İstanbul Adliyesi / Stüdyo',
    deadline: '2026-09-05',
    budget_amount: 40000,
    budget_currency: 'TRY',
    allow_budget_counter: true,
    is_published: true,
    dialogue_mode: 'script_tts',
    dialogue_script: 'Bu dosya kapanmadı.\nMüvekkilim masum.\nVe sen bunu biliyorsun.',
  },
  {
    project_name: 'İkinci Bahar Koleji',
    role_name: 'Öğretmen Melis',
    role_description:
      '25–33 yaş kadın. Gençlik / okul dizisi. Enerjik, sabırlı, modern öğretmen tipajı.',
    age_min: 25,
    age_max: 33,
    gender: 'female',
    height_min_cm: 160,
    height_max_cm: 175,
    shoot_date: '2026-09-18',
    shoot_location: 'İzmir',
    deadline: '2026-09-02',
    budget_amount: 22000,
    budget_currency: 'TRY',
    allow_budget_counter: true,
    is_published: true,
    dialogue_mode: 'none',
  },
  {
    project_name: 'Gece Vardiyası',
    role_name: 'Taksi Şoförü',
    role_description:
      '30–45 yaş, cinsiyet fark etmez. Kısa film. Az konuşan, dinleyen karakter. Gece çekimleri.',
    age_min: 30,
    age_max: 45,
    gender: 'any',
    height_min_cm: 160,
    height_max_cm: 185,
    shoot_date: '2026-09-05',
    shoot_location: 'İstanbul / Beşiktaş',
    deadline: '2026-08-27',
    budget_amount: 14000,
    budget_currency: 'TRY',
    allow_budget_counter: true,
    is_published: true,
    dialogue_mode: 'none',
  },
];

async function main() {
  const admin = await findUserByEmail(ADMIN_EMAIL);
  if (!admin) throw new Error('Admin user not found: ' + ADMIN_EMAIL);
  console.log('admin', admin.id);

  // ensure admin profile
  await api(`/rest/v1/profiles?id=eq.${admin.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ role: 'admin', actor_status: 'approved' }),
  });

  const actorUsers = [];
  for (const a of ACTORS) {
    const user = await ensureUser({
      email: a.email,
      fullName: a.fullName,
      phone: a.phone,
      role: 'actor',
    });
    await upsertActorProfile(user.id, a.profile);
    actorUsers.push({ ...a, id: user.id });
  }

  // clear previous seed casts by project name (idempotent-ish)
  for (const c of CASTS) {
    await api(`/rest/v1/cast_listings?project_name=eq.${encodeURIComponent(c.project_name)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    }).catch(() => undefined);
  }

  const createdCasts = [];
  for (const c of CASTS) {
    const rows = await api('/rest/v1/cast_listings', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ ...c, created_by: admin.id }),
    });
    const cast = Array.isArray(rows) ? rows[0] : rows;
    createdCasts.push(cast);
    console.log('cast', cast.project_name, cast.id);
  }

  // applications
  const apps = [
    {
      cast: createdCasts[0],
      actor: actorUsers[0],
      status: 'submitted',
      accept_budget: true,
    },
    {
      cast: createdCasts[0],
      actor: actorUsers[4],
      status: 'shortlisted',
      accept_budget: false,
      counter_budget: 60000,
    },
    {
      cast: createdCasts[1],
      actor: actorUsers[1],
      status: 'audition_invited',
      accept_budget: true,
    },
    {
      cast: createdCasts[1],
      actor: actorUsers[3],
      status: 'under_review',
      accept_budget: false,
      counter_budget: 15000,
      note: 'Motosiklet ehliyetim var.',
    },
    {
      cast: createdCasts[2],
      actor: actorUsers[2],
      status: 'submitted',
      accept_budget: true,
    },
  ];

  for (const app of apps) {
    await api('/rest/v1/applications', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        cast_id: app.cast.id,
        actor_id: app.actor.id,
        status: app.status,
        accept_budget: app.accept_budget,
        counter_budget: app.counter_budget ?? null,
        note: app.note ?? null,
      }),
    });
  }
  console.log('applications', apps.length);

  // announcements
  await api('/rest/v1/announcements?title_tr=eq.Yeni%20sezon%20cast%20duyurusu', {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  }).catch(() => undefined);

  await api('/rest/v1/announcements', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([
      {
        title_tr: 'Yeni sezon cast duyurusu',
        title_en: 'New season casting notice',
        body_tr:
          'Ağustos-Eylül dönemi için yeni cast ilanları yayınlandı. Portföyünüzü güncelleyip başvurabilirsiniz.',
        body_en:
          'New cast listings for Aug–Sep are live. Update your portfolio and apply.',
        created_by: admin.id,
      },
      {
        title_tr: 'Tanıtım videosu hatırlatması',
        title_en: 'Intro video reminder',
        body_tr:
          'Profilinizde güncel bir tanıtım videosu olması başvurularınızı güçlendirir. “Tanıtım Ver” ile yenileyebilirsiniz.',
        body_en:
          'A fresh intro video strengthens applications. Use Record Intro to update it.',
        created_by: admin.id,
      },
    ]),
  });
  console.log('announcements ok');

  // conversation sample for first actor
  const convRows = await api('/rest/v1/conversations', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ actor_id: actorUsers[0].id }),
  });
  const conv = Array.isArray(convRows) ? convRows[0] : convRows;
  if (conv?.id) {
    await api('/rest/v1/messages', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([
        {
          conversation_id: conv.id,
          sender_id: admin.id,
          body: 'Merhaba Elif, portföyünü inceledik. “Boğazın Öteki Yüzü” için kısa listeye aldık.',
        },
        {
          conversation_id: conv.id,
          sender_id: actorUsers[0].id,
          body: 'Harika, teşekkürler! Audition için müsaitim.',
        },
      ]),
    });
    console.log('messages ok');
  }

  console.log('\nDone. Fake actors password:', PASSWORD);
  console.log('Actors:');
  for (const a of actorUsers) console.log(' -', a.email, a.fullName);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
