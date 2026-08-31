import {
  ageFromBirth,
  boolLabel,
  countryLabel,
  formatDate,
  formatLanguages,
  DANCES,
  EDUCATION,
  EYES,
  GENDER,
  HAIR,
  MODEL,
  PERFORMANCE,
  PHOTO_KIND,
  PROFESSION,
  SPECIAL,
  SPORTS,
  VIDEO_KIND,
  label,
  listLabel,
} from "@/lib/labels";
import { BrandedVideo } from "@/components/branded-video";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayImageUrl } from "@/lib/media";
import { REQUIRED_PHOTO_KINDS } from "@/lib/types";
import type { SharedActorPayload } from "@/lib/types";

function field(k: string, v?: React.ReactNode) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-border py-2 text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="col-span-2">{v || "—"}</dd>
    </div>
  );
}

function PhotoFigure({ src, caption }: { src: string; caption: string }) {
  return (
    <figure>
      <a href={src} target="_blank" rel="noreferrer" className="block rounded-lg bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={caption} className="h-auto w-full rounded-lg object-contain" />
      </a>
      <figcaption className="mt-1 text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

export function ActorPortfolio({ data }: { data: SharedActorPayload }) {
  const { profile, actor, photos, videos } = data;
  const age = ageFromBirth(actor?.birth_date);
  const avatarSrc = displayImageUrl(profile.avatar_url);
  const profileKinds = new Set(["intro", "mimic", "showreel", "talent"]);
  const extras = videos.filter((v) => v.playback_url && !profileKinds.has((v.kind ?? "").toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kimlik</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              {field("Ad soyad", profile.full_name)}
              {field("E-posta", profile.email)}
              {field("Telefon", profile.phone)}
              {field("WhatsApp", actor?.whatsapp)}
              {field("TC vatandaşı", boolLabel(actor?.is_turkish_citizen))}
              {field("Uyruk", countryLabel(actor?.nationality))}
              {field("Doğum", `${formatDate(actor?.birth_date)} (${age ?? "—"} yaş)`)}
              {field("Doğum yeri", actor?.birth_place)}
              {field("Cinsiyet", label(GENDER, actor?.gender))}
              {field("Şehir", actor?.city)}
              {field("Adres", actor?.address)}
              {field("Instagram", actor?.instagram)}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fiziksel</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              {field("Boy", actor?.height_cm)}
              {field("Kilo", actor?.weight_kg)}
              {field("Saç", label(HAIR, actor?.hair_color))}
              {field("Göz", label(EYES, actor?.eye_color))}
              {field("Tişört", actor?.tshirt_size)}
              {field("Pantolon", actor?.pants_size)}
              {field("Takım", actor?.suit_size)}
              {field("Ayakkabı", actor?.shoe_size)}
              {field("Beden", actor?.body_size)}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kariyer</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              {field("Eğitim", label(EDUCATION, actor?.education))}
              {field("Meslek", label(PROFESSION, actor?.profession))}
              {field("Oyunculuk eğitimi", actor?.acting_education)}
              {field("Deneyim", actor?.experience)}
              {field("Diller", formatLanguages(actor?.languages))}
              {field("Aksan", actor?.accents)}
              {field("Enstrüman", actor?.instruments)}
              {field("Müsaitlik", actor?.availability)}
              {field("Diğer ajans", actor?.other_agency)}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yetenekler</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              {field("Spor", listLabel(SPORTS, actor?.sports))}
              {field("Dans", listLabel(DANCES, actor?.dances))}
              {field("Dans diğer", actor?.dances_other)}
              {field("Model", listLabel(MODEL, actor?.model_skills))}
              {field("Performans", listLabel(PERFORMANCE, actor?.performance_skills))}
              {field("Özel durum", listLabel(SPECIAL, actor?.special_conditions))}
              {field("Ehliyet", actor?.driving_info)}
              {field("İlgi", actor?.special_interests)}
              {field("Not", actor?.additional_notes)}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fotoğraflar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {avatarSrc ? <PhotoFigure src={avatarSrc} caption="Profil" /> : null}
          {photos.map((p) => (
            <PhotoFigure
              key={p.id}
              src={displayImageUrl(p.public_url, 1600) ?? p.public_url}
              caption={`${label(PHOTO_KIND, p.kind)}${
                p.kind && REQUIRED_PHOTO_KINDS.includes(p.kind as (typeof REQUIRED_PHOTO_KINDS)[number])
                  ? " *"
                  : ""
              }`}
            />
          ))}
          {!avatarSrc && photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Fotoğraf yok.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Videolar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Tanıtım", url: actor?.intro_video_playback_url },
            { label: "Mimik", url: actor?.mimic_video_playback_url },
            { label: "Showreel", url: actor?.showreel_playback_url },
            { label: "Yetenek", url: actor?.talent_video_playback_url },
          ].map((v) =>
            v.url ? (
              <div key={v.label}>
                <p className="mb-1 text-sm font-medium">{v.label}</p>
                <BrandedVideo src={v.url} />
              </div>
            ) : null
          )}
          {extras.map((v) => (
            <div key={v.id}>
              <p className="mb-1 text-sm font-medium">{v.title || label(VIDEO_KIND, v.kind)}</p>
              <BrandedVideo src={v.playback_url!} />
            </div>
          ))}
          {!actor?.intro_video_playback_url &&
          !actor?.mimic_video_playback_url &&
          !actor?.showreel_playback_url &&
          !actor?.talent_video_playback_url &&
          extras.length === 0 ? (
            <p className="text-sm text-muted-foreground">Video yok.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
