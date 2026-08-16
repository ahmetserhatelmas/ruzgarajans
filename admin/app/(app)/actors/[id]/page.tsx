import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActorStatusBadge, AppStatusBadge } from "@/components/status-badge";
import { fetchActorDetail } from "@/lib/queries";
import { hasCompletedForm, hasRequiredMedia } from "@/lib/access";
import {
  ageFromBirth,
  boolLabel,
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
import { setActorStatusAction, startConversationAction } from "@/lib/actions";
import { REQUIRED_PHOTO_KINDS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ActorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, actor, photos, applications, videos } = await fetchActorDetail(id);
  if (!profile) notFound();

  const photoKinds = photos.map((p) => p.kind).filter(Boolean) as string[];
  const mediaOk = hasRequiredMedia(profile, actor, photoKinds);
  const age = ageFromBirth(actor?.birth_date);

  const field = (k: string, v?: React.ReactNode) => (
    <div className="grid grid-cols-3 gap-2 border-b border-border py-2 text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="col-span-2">{v || "—"}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile.full_name || "Oyuncu"}
        description={profile.email ?? undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <form action={startConversationAction.bind(null, profile.id)}>
              <Button type="submit" variant="outline">
                Mesaj yaz
              </Button>
            </form>
            {profile.actor_status !== "approved" ? (
              <form action={setActorStatusAction.bind(null, profile.id, "approved")}>
                <Button type="submit">Onayla</Button>
              </form>
            ) : null}
            {profile.actor_status !== "rejected" ? (
              <form action={setActorStatusAction.bind(null, profile.id, "rejected")}>
                <Button type="submit" variant="destructive">
                  Reddet
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <ActorStatusBadge status={profile.actor_status} />
        <span className="text-sm text-muted-foreground">
          Form: {hasCompletedForm(actor) ? "tamam" : "eksik"} · Medya:{" "}
          {mediaOk ? "tamam" : "eksik"}
        </span>
      </div>

      {profile.cover_url ? (
        <div className="relative h-40 overflow-hidden rounded-xl bg-muted">
          <Image src={profile.cover_url} alt="" fill className="object-cover" unoptimized />
        </div>
      ) : null}

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
              {field("TCKN", actor?.national_id)}
              {field("Doğum", `${formatDate(actor?.birth_date)} (${age ?? "—"} yaş)`)}
              {field("Doğum yeri", actor?.birth_place)}
              {field("Cinsiyet", label(GENDER, actor?.gender))}
              {field("Şehir", actor?.city)}
              {field("Adres", actor?.address)}
              {field("Instagram", actor?.instagram)}
              {field("Kayıt tarihi", formatDate(actor?.registration_date))}
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
              {field("Eğitim", actor?.education)}
              {field("Meslek", actor?.profession)}
              {field("Oyunculuk eğitimi", actor?.acting_education)}
              {field("Deneyim", actor?.experience)}
              {field("Diller", actor?.languages?.join(", "))}
              {field("Aksan", actor?.accents)}
              {field("Enstrüman", actor?.instruments)}
              {field("Müsaitlik", actor?.availability)}
              {field("Diğer ajans", actor?.other_agency)}
              {field("Referans", actor?.referral_source)}
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
              {field("Model", actor?.model_skills?.join(", "))}
              {field("Performans", actor?.performance_skills?.join(", "))}
              {field("Özel durum", actor?.special_conditions?.join(", "))}
              {field("Ehliyet", actor?.driving_info)}
              {field("İlgi", actor?.special_interests)}
              {field("Not", actor?.additional_notes)}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Banka & evrak</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              {field("Hesap adı", actor?.bank_account_name)}
              {field("Banka", actor?.bank_name)}
              {field("IBAN", actor?.iban)}
              {field("Pasaport", boolLabel(actor?.has_passport))}
              {field("Pasaport no", actor?.passport_no)}
              {field("Pasaport tipi", actor?.passport_type)}
              {field("Vize", actor?.visa_countries)}
              {field("Çalışma izni", boolLabel(actor?.has_work_permit))}
              {field("İkamet", boolLabel(actor?.has_residence_permit))}
              {field("KVKK", boolLabel(actor?.kvkk_accepted))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fotoğraflar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profile.avatar_url ? (
            <figure>
              <Image
                src={profile.avatar_url}
                alt="Profil"
                width={400}
                height={400}
                className="h-56 w-full rounded-lg object-cover"
                unoptimized
              />
              <figcaption className="mt-1 text-xs text-muted-foreground">Profil</figcaption>
            </figure>
          ) : (
            <p className="text-sm text-destructive">Profil fotoğrafı eksik</p>
          )}
          {photos.map((p) => (
            <figure key={p.id}>
              <Image
                src={p.public_url}
                alt={p.kind ?? ""}
                width={400}
                height={400}
                className="h-56 w-full rounded-lg object-cover"
                unoptimized
              />
              <figcaption className="mt-1 text-xs text-muted-foreground">
                {label(PHOTO_KIND, p.kind)}
                {p.kind && REQUIRED_PHOTO_KINDS.includes(p.kind as (typeof REQUIRED_PHOTO_KINDS)[number])
                  ? " *"
                  : ""}
              </figcaption>
            </figure>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Videolar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Tanıtım *", url: actor?.intro_video_playback_url },
            { label: "Mimik *", url: actor?.mimic_video_playback_url },
            { label: "Showreel", url: actor?.showreel_playback_url },
            { label: "Yetenek", url: actor?.talent_video_playback_url },
          ].map((v) => (
            <div key={v.label}>
              <p className="mb-1 text-sm font-medium">{v.label}</p>
              {v.url ? (
                <video src={v.url} controls className="w-full rounded-lg bg-black" />
              ) : (
                <p className="text-sm text-muted-foreground">Yok</p>
              )}
            </div>
          ))}
          {videos.map((v) => (
            <div key={v.id}>
              <p className="mb-1 text-sm font-medium">
                {label(VIDEO_KIND, v.kind)} · {v.status}
              </p>
              {v.playback_url ? (
                <video src={v.playback_url} controls className="w-full rounded-lg bg-black" />
              ) : (
                <p className="text-sm text-muted-foreground">Hazır değil</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Başvurular</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Başvuru yok.</p>
          ) : (
            applications.map((a) => (
              <Link
                key={a.id}
                href={`/applications/${a.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
              >
                <span>
                  {a.cast_listings?.project_name} · {a.cast_listings?.role_name}
                </span>
                <AppStatusBadge status={a.status} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
