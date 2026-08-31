import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { CastForm } from "@/components/cast-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppStatusBadge, ActorStatusBadge } from "@/components/status-badge";
import { fetchActorRows, fetchCastDetail, matchesCast } from "@/lib/queries";
import { hasCompletedForm, hasRequiredMedia } from "@/lib/access";
import { ageFromBirth, GENDER, label } from "@/lib/labels";
import { toggleCastPublishedAction } from "@/lib/actions";
import { CastIntroducePicker, IntroduceButton } from "@/components/cast-introduce";
import { CastOptionPicker, OptionButton } from "@/components/cast-option";
import { BrandedVideo } from "@/components/branded-video";
import { canAdmin, requireAdminPerm } from "@/lib/permissions";
import { ApplicationsExcelButton } from "@/components/applications-excel";
import { applicationExcelRow } from "@/lib/export-application";
import { listingExportSlug } from "@/lib/export-actor";
import { displayImageUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function CastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile: admin } = await requireAdminPerm("casts");
  const canExportApplications = canAdmin(admin, "export_applications");
  const [{ cast, applications, videos, introductions, options }, actors] = await Promise.all([
    fetchCastDetail(id),
    fetchActorRows(),
  ]);
  if (!cast) notFound();
  const introducedIds = new Set(introductions.map((row) => row.actor_id));
  const optionByActor = new Map(options.map((row) => [row.actor_id, row]));
  const pickerActors = actors
    .filter((row) => row.profile.actor_status === "approved")
    .map((row) => ({
      id: row.profile.id,
      name: row.profile.full_name || row.profile.email || row.profile.id,
    }));

  const matches = actors.filter(
    (row) =>
      row.profile.actor_status === "approved" &&
      hasCompletedForm(row.actor) &&
      hasRequiredMedia(row.profile, row.actor, row.photoKinds) &&
      matchesCast(row, cast)
  );

  const logoSrc = displayImageUrl(cast.cover_image_url, 160) ?? cast.cover_image_url;

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt=""
            className="size-16 shrink-0 rounded-full object-cover ring-1 ring-foreground/10"
          />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
            Logo
          </span>
        )}
        <div className="min-w-0 flex-1">
          <PageHeader
            title={cast.project_name}
            description={cast.role_name}
            actions={
              <form action={toggleCastPublishedAction.bind(null, cast.id, !cast.is_published)}>
                <Button type="submit" variant="outline">
                  {cast.is_published ? "Yayından kaldır" : "Yayınla"}
                </Button>
              </form>
            }
          />
        </div>
      </div>

      <CastForm cast={cast} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Başvurular ({applications.length})</CardTitle>
          {canExportApplications ? (
            <ApplicationsExcelButton
              filename={`${listingExportSlug(cast.project_name)}-basvurular.xlsx`}
              rows={applications.map((a) => applicationExcelRow(a, a.profiles, cast))}
            />
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz başvuru yok.</p>
          ) : (
            applications.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <Link href={`/applications/${a.id}`} className="min-w-0 hover:underline">
                  {a.profiles?.full_name || a.profiles?.email}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <AppStatusBadge status={a.status} />
                  {canExportApplications ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/applications/${a.id}/export`}>İndir</a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opsiyonlanan oyuncular ({options.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="mb-3 text-sm text-muted-foreground">
            Seçtiğin oyuncuya bildirim gider. İlanı açıp evet / hayır der; cevabı burada görünür.
          </p>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz opsiyon yok.</p>
          ) : (
            options.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <Link href={`/actors/${row.actor_id}`} className="min-w-0 hover:underline">
                  {row.profiles?.full_name || row.profiles?.email}
                </Link>
                <OptionButton
                  castId={cast.id}
                  actorId={row.actor_id}
                  status={row.status}
                />
              </div>
            ))
          )}
          <div className="pt-3">
            <CastOptionPicker
              castId={cast.id}
              actors={pickerActors}
              optionedIds={options.map((row) => row.actor_id)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tanıtılan oyuncular ({introductions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="mb-3 text-sm text-muted-foreground">
            Firmaya tanıttığın oyuncular ilanı açınca bunu görür. Başvuruları kapanmaz.
          </p>
          {introductions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz tanıtım yok.</p>
          ) : (
            introductions.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <Link href={`/actors/${row.actor_id}`} className="min-w-0 hover:underline">
                  {row.profiles?.full_name || row.profiles?.email}
                </Link>
                <IntroduceButton castId={cast.id} actorId={row.actor_id} introduced />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uyan oyuncular ({matches.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="mb-3 text-sm text-muted-foreground">
            Onaylı + form + medya + yaş/cinsiyet/boy/uyruk/dil kriterleri. Opsiyonla = evet/hayır sorar. Tanıt = firmaya tanıtım.
          </p>
          {matches.slice(0, 40).map((row) => (
            <div
              key={row.profile.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <Link href={`/actors/${row.profile.id}`} className="min-w-0 hover:underline">
                {row.profile.full_name} · {ageFromBirth(row.actor?.birth_date) ?? "—"} ·{" "}
                {label(GENDER, row.actor?.gender)} · {row.actor?.height_cm ?? "—"} cm
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <ActorStatusBadge status={row.profile.actor_status} />
                <OptionButton
                  castId={cast.id}
                  actorId={row.profile.id}
                  status={optionByActor.get(row.profile.id)?.status}
                />
                <IntroduceButton
                  castId={cast.id}
                  actorId={row.profile.id}
                  introduced={introducedIds.has(row.profile.id)}
                />
              </div>
            </div>
          ))}
          <div className="pt-3">
            <CastIntroducePicker
              castId={cast.id}
              actors={pickerActors}
              introducedIds={[...introducedIds]}
            />
          </div>
        </CardContent>
      </Card>

      {videos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Audition videoları</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {videos.map((v) =>
              v.playback_url ? (
                <BrandedVideo key={v.id} src={v.playback_url} />
              ) : null
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
