# Rüzgâr Ajans — Mobil Uygulama

Oyuncuların dijital portföy oluşturduğu, yalnızca **Rüzgâr Ajans** cast ilanlarına başvurduğu React Native (Expo) uygulaması.

**Stack:** Expo Router · Supabase (Auth, Postgres, Storage, Edge Functions) · Cloudflare Stream (video)

> Şimdilik yalnızca mobil uygulama. Web yönetim paneli sonraki fazda eklenecek; yönetici akışları mobilde de mevcut.

## Özellikler (v1)

- TR / EN dil seçimi (ilk açılış + ayarlar)
- Oyuncu kayıt / giriş, ajans onayı (`pending` → `approved`)
- Portföy: fotoğraf, kapak, fiziksel bilgiler, özgeçmiş, yetenekler
- **Tanıtım Ver** — kamera ile kayıt → Cloudflare Stream
- Cast ilanları, başvuru, **Yüksek Bütçe Talep Et**
- **Oyun Ver** — proje bazlı audition videosu
- Diyalog destekli audition (TTS senaryo / hazır ses)
- Ajans-only mesajlaşma
- WhatsApp Destek butonu
- Mobil yönetici: oyuncu onay, ilan, başvuru, duyuru, proje arşivi

## Kurulum

```bash
cp .env.example .env
# .env içini doldur
npm install
npx expo start
```

### Supabase

1. Yeni proje oluştur.
2. `supabase/migrations/001_initial.sql` dosyasını SQL Editor’da çalıştır.
3. Storage bucket’ları migration içinde oluşturulur (`avatars`, `covers`, `gallery`, `dialogue-audio`).
4. Bir kullanıcıyı yönetici yapmak için:

```sql
update public.profiles set role = 'admin' where email = 'ajans@example.com';
```

### Cloudflare Stream

1. Cloudflare hesabında Stream’i aç.
2. API Token + Account ID al.
3. Edge Function deploy:

```bash
supabase functions deploy cf-stream-upload
supabase secrets set CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_STREAM_API_TOKEN=...
```

4. `.env` içine `EXPO_PUBLIC_CF_CUSTOMER_SUBDOMAIN` ekle.

## Klasör yapısı

```
app/
  (auth)/     Dil, login, register, onay bekleyen
  (actor)/    Oyuncu sekmeleri
  (admin)/    Yönetici sekmeleri
  record/     Tanıtım / audition kamera
lib/          Supabase, i18n, Cloudflare helper
services/     API katmanı
supabase/     SQL + Edge Functions
```

## Sonraki fazlar (opsiyonel)

- Web admin paneli
- Push bildirimler (Expo Notifications + Supabase)
- Proje ZIP indirme & şifreli paylaşım linkleri
- Galeri sıralama / showreel upload UI
- Oyuncu filtreleme (boy, yaş, saç…) gelişmiş arama
