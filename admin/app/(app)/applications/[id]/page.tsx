import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppStatusBadge, ActorStatusBadge } from "@/components/status-badge";
import { fetchApplicationDetail } from "@/lib/queries";
import { APP_STATUS, formatDate, formatMoney, GENDER, HAIR, EYES, label } from "@/lib/labels";
import { deleteApplicationAction, setApplicationStatusAction } from "@/lib/actions";
import type { ApplicationStatus } from "@/lib/types";
import { BrandedVideo } from "@/components/branded-video";
import { canAdmin, requireAdminPerm } from "@/lib/permissions";
import { ShareApplicationPanel } from "@/components/share-application-panel";
import { fetchApplicationShares, fetchDirectors, sharePublicUrl } from "@/lib/share";

export const dynamic = "force-dynamic";

const STATUSES: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "shortlisted",
  "audition_invited",
  "accepted",
  "rejected",
];

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  const { id } = await params;
  const { share } = await searchParams;
  const { profile: admin } = await requireAdminPerm("applications");
  const canExport = canAdmin(admin, "export_applications");
  const [{ app, actor, videos }, shares, directors] = await Promise.all([
    fetchApplicationDetail(id),
    fetchApplicationShares(id),
    fetchDirectors(),
  ]);
  if (!app || !actor) notFound();
  const shareUrls: Record<string, string> = {};
  await Promise.all(
    shares.map(async (item) => {
      shareUrls[item.id] = await sharePublicUrl(item.token);
    })
  );

  const listing = app.cast_listings as {
    id: string;
    project_name: string;
    role_name: string;
    role_description: string;
    deadline: string | null;
    option_date: string | null;
    payment_due_date: string | null;
    budget_amount: number | null;
    budget_currency: string;
  } | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={listing?.project_name ?? "Başvuru"}
        description={listing?.role_name}
        actions={
          <div className="flex flex-wrap gap-2">
            {canExport ? (
              <Button asChild variant="outline">
                <a href={`/api/applications/${app.id}/export`}>İndir</a>
              </Button>
            ) : null}
            <form action={deleteApplicationAction.bind(null, app.id)}>
              <Button type="submit" variant="destructive">
                Başvuruyu sil
              </Button>
            </form>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <AppStatusBadge status={app.status} />
        {STATUSES.filter((s) => s !== app.status).map((s) => (
          <form key={s} action={setApplicationStatusAction.bind(null, app.id, s)}>
            <Button type="submit" size="sm" variant="outline">
              {APP_STATUS[s]}
            </Button>
          </form>
        ))}
      </div>

      <ShareApplicationPanel
        applicationId={app.id}
        title={`${listing?.project_name ?? "Başvuru"}${listing?.role_name ? ` · ${listing.role_name}` : ""}${
          actor.profile?.full_name ? ` · ${actor.profile.full_name}` : ""
        }`}
        shares={shares}
        directors={directors}
        urls={shareUrls}
        pinError={share === "pin"}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Oyuncu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <p className="font-medium">{actor.profile?.full_name}</p>
              {actor.profile ? <ActorStatusBadge status={actor.profile.actor_status} /> : null}
            </div>
            <p className="text-muted-foreground">{actor.profile?.email}</p>
            <p>{actor.profile?.phone}</p>
            <p>
              {label(GENDER, actor.actor?.gender)} · {actor.actor?.height_cm ?? "—"} cm ·{" "}
              {label(HAIR, actor.actor?.hair_color)} / {label(EYES, actor.actor?.eye_color)}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/actors/${app.actor_id}`}>Tam profil</Link>
            </Button>
            {actor.actor?.intro_video_playback_url ? (
              <BrandedVideo src={actor.actor.intro_video_playback_url} className="mt-3" />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Başvuru detayı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{listing?.role_description}</p>
            <p>Son tarih: {formatDate(listing?.deadline)}</p>
            <p>Opsiyon tarihi: {formatDate(listing?.option_date)}</p>
            <p>Ödeme vadesi: {formatDate(listing?.payment_due_date)}</p>
            <p>Bütçe: {formatMoney(listing?.budget_amount, listing?.budget_currency)}</p>
            <p>
              Oyuncu bütçesi:{" "}
              {app.accept_budget ? "Kabul etti" : formatMoney(app.counter_budget)}
            </p>
            {app.note ? <p>Not: {app.note}</p> : null}
            <p className="text-muted-foreground">{formatDate(app.created_at)}</p>
            {listing ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/casts/${listing.id}`}>İlana git</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audition videoları ({videos.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Audition videosu yok.</p>
          ) : (
            videos.map((v) =>
              v.playback_url ? (
                <BrandedVideo key={v.id} src={v.playback_url} />
              ) : (
                <p key={v.id} className="text-sm text-muted-foreground">
                  Video hazır değil
                </p>
              )
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
