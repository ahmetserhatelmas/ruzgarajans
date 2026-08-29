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
  countryLabel,
  formatLanguages,
  DANCES,
  EDUCATION,
  EYES,
  formatDate,
  formatMoney,
  GENDER,
  HAIR,
  INSURANCE,
  MODEL,
  PASSPORT_TYPE,
  PERFORMANCE,
  PROFESSION,
  SPECIAL,
  label,
  listLabel,
  PHOTO_KIND,
  SPORTS,
  VIDEO_KIND,
} from "@/lib/labels";
import { AcceptedProjectsTable } from "@/components/accepted-projects-table";
import { ShareActorPanel } from "@/components/share-actor-panel";
import { fetchActorShares, fetchDirectors, sharePublicUrl } from "@/lib/share";
import { setActorStatusAction, startConversationAction } from "@/lib/actions";
import { REQUIRED_PHOTO_KINDS } from "@/lib/types";
import { BrandedVideo } from "@/components/branded-video";
import { displayImageUrl } from "@/lib/media";
import { requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

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

export default async function ActorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  const { id } = await params;
  const { share } = await searchParams;
  await requireAdminPerm("actors");
  const [{ profile, actor, photos, applications, videos }, shares, directors] = await Promise.all([
    fetchActorDetail(id),
    fetchActorShares(id),
    fetchDirectors(),
  ]);
  if (!profile) notFound();
  const shareUrls: Record<string, string> = {};
  await Promise.all(
    shares.map(async (s) => {
      shareUrls[s.id] = await sharePublicUrl(s.token);
    })
  );

  const photoKinds = photos.map((p) => p.kind).filter(Boolean) as string[];
  const mediaOk = hasRequiredMedia(profile, actor, photoKinds);
  const age = ageFromBirth(actor?.birth_date);
  const avatarSrc = displayImageUrl(profile.avatar_url);
  const coverSrc = displayImageUrl(profile.cover_url, 1200);
  const profileVideoKinds = new Set(["intro", "mimic", "showreel", "talent"]);
  const extraVideos = videos.filter((v) => {
    const kind = (v.kind ?? "").toLowerCase();
    return v.status === "ready" && Boolean(v.playback_url) && !profileVideoKinds.has(kind);
  });

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
            <Button asChild variant="outline">
              <a href={`/api/actors/${profile.id}/export`}>İndir</a>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/actors/${profile.id}/kartvizit`}>Kartvizit</Link>
            </Button>
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

      <ShareActorPanel
        actorId={profile.id}
        shares={shares}
        directors={directors}
        urls={shareUrls}
        pinError={share === "pin"}
      />

      {coverSrc ? (
        <div className="relative h-40 overflow-hidden rounded-xl bg-muted">
          <Image src={coverSrc} alt="" fill className="object-cover" unoptimized />
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
              {field("Yakın telefonu", actor?.relative_phone)}
              {field("WhatsApp", actor?.whatsapp)}
              {field("TC vatandaşı", boolLabel(actor?.is_turkish_citizen))}
              {field("TCKN", actor?.national_id)}
              {field("Uyruk", countryLabel(actor?.nationality))}
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
              {field("Eğitim", label(EDUCATION, actor?.education))}
              {field("Meslek", label(PROFESSION, actor?.profession))}
              {field("Oyunculuk eğitimi", actor?.acting_education)}
              {field("Deneyim", actor?.experience)}
              {field("Diller", formatLanguages(actor?.languages))}
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
              {field("Model", listLabel(MODEL, actor?.model_skills))}
              {field("Performans", listLabel(PERFORMANCE, actor?.performance_skills))}
              {field("Özel durum", listLabel(SPECIAL, actor?.special_conditions))}
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
              {field("Sigorta (günlük)", label(INSURANCE, actor?.insurance_status))}
              {field("Sigorta notu", actor?.insurance_other)}
              {field("Pasaport", boolLabel(actor?.has_passport))}
              {field("Pasaport no", actor?.passport_no)}
              {field("Pasaport tipi", label(PASSPORT_TYPE, actor?.passport_type))}
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
          {avatarSrc ? (
            <PhotoFigure src={avatarSrc} caption="Profil" />
          ) : (
            <p className="text-sm text-destructive">Profil fotoğrafı eksik</p>
          )}
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
                <BrandedVideo src={v.url} />
              ) : (
                <p className="text-sm text-muted-foreground">Yok</p>
              )}
            </div>
          ))}
          {extraVideos.map((v) => (
            <div key={v.id}>
              <p className="mb-1 text-sm font-medium">{label(VIDEO_KIND, v.kind)}</p>
              <BrandedVideo src={v.playback_url!} />
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

      <AcceptedProjectsTable
        actorName={profile.full_name || "oyuncu"}
        rows={applications
          .filter((a) => a.status === "accepted")
          .map((a) => {
            const listing = a.cast_listings;
            const listed = listing?.budget_amount ?? null;
            const currency = listing?.budget_currency ?? "TRY";
            const agreed = a.accept_budget ? listed : (a.counter_budget ?? listed);
            const rawDate = listing?.shoot_date || listing?.option_date || "";
            return {
              id: a.id,
              yapim: listing?.project_name ?? "",
              proje: listing?.role_name ?? "",
              tarih: rawDate ? formatDate(rawDate) : "",
              ucret: listed == null ? "" : formatMoney(listed, currency),
              odeme: agreed == null ? "" : formatMoney(agreed, currency),
            };
          })}
      />
    </div>
  );
}
