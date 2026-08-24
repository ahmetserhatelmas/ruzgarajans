import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { fetchActorRows, fetchApplications, fetchCasts } from "@/lib/queries";
import { hasCompletedForm, hasRequiredMedia } from "@/lib/access";
import { APP_STATUS } from "@/lib/labels";
import type { ApplicationStatus } from "@/lib/types";
import { canAdmin, getAdminProfile } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await getAdminProfile();
  const { error } = await searchParams;
  const [actors, casts, applications] = await Promise.all([
    fetchActorRows(),
    fetchCasts(),
    fetchApplications(),
  ]);

  const pending = actors.filter((a) => a.profile.actor_status === "pending").length;
  const approved = actors.filter((a) => a.profile.actor_status === "approved").length;
  const rejected = actors.filter((a) => a.profile.actor_status === "rejected").length;
  const noForm = actors.filter((a) => !hasCompletedForm(a.actor)).length;
  const noMedia = actors.filter(
    (a) => !hasRequiredMedia(a.profile, a.actor, a.photoKinds)
  ).length;
  const published = casts.filter((c) => c.is_published).length;

  const byStatus = (Object.keys(APP_STATUS) as ApplicationStatus[]).map((status) => ({
    status,
    count: applications.filter((a) => a.status === status).length,
  }));

  const stats = [
    canAdmin(profile, "actors") ? { label: "Oyuncu", value: actors.length, href: "/actors" } : null,
    canAdmin(profile, "actors")
      ? { label: "Onay bekleyen", value: pending, href: "/actors?status=pending" }
      : null,
    canAdmin(profile, "actors")
      ? { label: "Onaylı", value: approved, href: "/actors?status=approved" }
      : null,
    canAdmin(profile, "actors")
      ? { label: "Reddedilen", value: rejected, href: "/actors?status=rejected" }
      : null,
    canAdmin(profile, "actors")
      ? { label: "Formu eksik", value: noForm, href: "/actors?form=missing" }
      : null,
    canAdmin(profile, "actors")
      ? { label: "Medyası eksik", value: noMedia, href: "/actors?media=missing" }
      : null,
    canAdmin(profile, "casts")
      ? { label: "Yayındaki ilan", value: published, href: "/casts?published=yes" }
      : null,
    canAdmin(profile, "applications")
      ? { label: "Toplam başvuru", value: applications.length, href: "/applications" }
      : null,
  ].filter((s): s is { label: string; value: number; href: string } => Boolean(s));

  return (
    <div>
      <PageHeader
        title="Özet"
        description="Ajansın güncel durumu. Filtreli listelere kartlardan geçebilirsin."
      />
      {error === "forbidden" ? (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Bu bölüme yetkin yok.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-4xl">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {canAdmin(profile, "applications") ? (
        <>
          <h2 className="mt-10 mb-3 font-heading text-2xl">Başvuru durumları</h2>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {byStatus.map((s) => (
              <Link key={s.status} href={`/applications?status=${s.status}`}>
                <Card size="sm" className="hover:bg-muted/40">
                  <CardHeader>
                    <CardTitle className="text-xs text-muted-foreground">
                      {APP_STATUS[s.status]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-medium">{s.count}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
