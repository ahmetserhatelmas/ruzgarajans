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

export const dynamic = "force-dynamic";

export default async function CastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ cast, applications, videos }, actors] = await Promise.all([
    fetchCastDetail(id),
    fetchActorRows(),
  ]);
  if (!cast) notFound();

  const matches = actors.filter(
    (row) =>
      row.profile.actor_status === "approved" &&
      hasCompletedForm(row.actor) &&
      hasRequiredMedia(row.profile, row.actor, row.photoKinds) &&
      matchesCast(row, cast)
  );

  return (
    <div className="space-y-8">
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

      <CastForm cast={cast} />

      <Card>
        <CardHeader>
          <CardTitle>Başvurular ({applications.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz başvuru yok.</p>
          ) : (
            applications.map((a) => (
              <Link
                key={a.id}
                href={`/applications/${a.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
              >
                <span>{a.profiles?.full_name || a.profiles?.email}</span>
                <AppStatusBadge status={a.status} />
              </Link>
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
            Onaylı + form + medya + yaş/cinsiyet/boy/uyruk/dil kriterleri.
          </p>
          {matches.slice(0, 40).map((row) => (
            <Link
              key={row.profile.id}
              href={`/actors/${row.profile.id}`}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
            >
              <span>
                {row.profile.full_name} · {ageFromBirth(row.actor?.birth_date) ?? "—"} ·{" "}
                {label(GENDER, row.actor?.gender)} · {row.actor?.height_cm ?? "—"} cm
              </span>
              <ActorStatusBadge status={row.profile.actor_status} />
            </Link>
          ))}
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
                <video key={v.id} src={v.playback_url} controls className="w-full rounded-lg bg-black" />
              ) : null
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
