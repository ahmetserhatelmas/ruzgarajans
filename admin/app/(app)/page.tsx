import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { fetchAdminAlerts, fetchDashboardStats } from "@/lib/queries";
import { isAwaitingApproval, isFormSectionSaved, isMediaSectionSaved } from "@/lib/access";
import { APP_STATUS } from "@/lib/labels";
import type { ActorProfile, ApplicationStatus } from "@/lib/types";
import { canAdmin, getAdminProfile } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { profile } = await getAdminProfile();
  const { error, ok } = await searchParams;
  const [statsData, alerts] = await Promise.all([
    fetchDashboardStats(),
    canAdmin(profile, "applications") ? fetchAdminAlerts(8) : Promise.resolve([]),
  ]);
  const unreadAlerts = alerts.filter((alert) => !alert.read_at);
  const actorById = new Map(statsData.actors.map((a) => [a.user_id, a]));
  const kindsByUser = new Map<string, string[]>();
  for (const photo of statsData.kinds) {
    if (!photo.kind) continue;
    const list = kindsByUser.get(photo.user_id) ?? [];
    list.push(photo.kind);
    kindsByUser.set(photo.user_id, list);
  }
  const pending = statsData.profiles.filter((a) =>
    isAwaitingApproval(a, (actorById.get(a.id) as ActorProfile | undefined) ?? null),
  ).length;
  const approved = statsData.profiles.filter((a) => a.actor_status === "approved").length;
  const rejected = statsData.profiles.filter((a) => a.actor_status === "rejected").length;
  const noForm = statsData.profiles.filter(
    (a) => !isFormSectionSaved((actorById.get(a.id) as ActorProfile | undefined) ?? null),
  ).length;
  const noMedia = statsData.profiles.filter(
    (a) => !isMediaSectionSaved((actorById.get(a.id) as ActorProfile | undefined) ?? null, kindsByUser.get(a.id) ?? []),
  ).length;
  const published = statsData.casts.filter((c) => c.is_published).length;

  const byStatus = (Object.keys(APP_STATUS) as ApplicationStatus[]).map((status) => ({
    status,
    count: statsData.applications.filter((a) => a.status === status).length,
  }));

  const stats = [
    canAdmin(profile, "actors") ? { label: "Oyuncu", value: statsData.profiles.length, href: "/actors" } : null,
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
      ? { label: "Toplam başvuru", value: statsData.applications.length, href: "/applications" }
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
      {ok ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {decodeURIComponent(ok)}
        </p>
      ) : null}
      {unreadAlerts.length ? (
        <div className="mb-6 space-y-2 rounded-xl bg-primary/5 p-4 ring-1 ring-primary/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Yeni bildirimler</p>
            <Link href="/alerts" className="text-sm text-primary hover:underline">
              Tümünü gör
            </Link>
          </div>
          <ul className="space-y-2">
            {unreadAlerts.slice(0, 5).map((alert) => (
              <li key={alert.id}>
                <Link
                  href={alert.application_id ? `/applications/${alert.application_id}` : "/alerts"}
                  className="block text-sm hover:underline"
                >
                  <span className="font-medium">{alert.title}</span>
                  <span className="text-muted-foreground"> · {alert.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
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
