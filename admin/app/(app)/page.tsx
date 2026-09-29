import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/page-skeleton";
import { fetchAdminAlerts } from "@/lib/queries";
import { getCachedDashboardStats } from "@/lib/admin-cache";
import { APP_STATUS } from "@/lib/labels";
import type { ApplicationStatus } from "@/lib/types";
import { canAdmin, requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
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
      <Suspense fallback={<TableSkeleton />}>
        <DashboardBody />
      </Suspense>
    </div>
  );
}

async function DashboardBody() {
  const { profile } = await requireAdminPerm();
  const statsData = await getCachedDashboardStats();

  const byStatus = (Object.keys(APP_STATUS) as ApplicationStatus[]).map((status) => ({
    status,
    count: statsData.app_by_status[status] ?? 0,
  }));

  const stats = [
    canAdmin(profile, "actors")
      ? { label: "Oyuncu", value: statsData.actors, href: "/actors" }
      : null,
    canAdmin(profile, "actors")
      ? { label: "Onay bekleyen", value: statsData.pending, href: "/actors?status=pending" }
      : null,
    canAdmin(profile, "actors")
      ? { label: "Onaylı", value: statsData.approved, href: "/actors?status=approved" }
      : null,
    canAdmin(profile, "actors")
      ? { label: "Reddedilen", value: statsData.rejected, href: "/actors?status=rejected" }
      : null,
    canAdmin(profile, "actors")
      ? { label: "Formu eksik", value: statsData.no_form, href: "/actors?form=missing" }
      : null,
    canAdmin(profile, "actors")
      ? { label: "Medyası eksik", value: statsData.no_media, href: "/actors?media=missing" }
      : null,
    canAdmin(profile, "casts")
      ? { label: "Yayındaki ilan", value: statsData.published_casts, href: "/casts?published=yes" }
      : null,
    canAdmin(profile, "applications")
      ? { label: "Toplam başvuru", value: statsData.applications, href: "/applications" }
      : null,
  ].filter((s): s is { label: string; value: number; href: string } => Boolean(s));

  return (
    <>
      {canAdmin(profile, "applications") ? (
        <Suspense fallback={null}>
          <DashboardAlerts />
        </Suspense>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} prefetch={false}>
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
              <Link key={s.status} href={`/applications?status=${s.status}`} prefetch={false}>
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
    </>
  );
}

async function DashboardAlerts() {
  const alerts = await fetchAdminAlerts(8);
  const unreadAlerts = alerts.filter((alert) => !alert.read_at);
  if (!unreadAlerts.length) return null;
  return (
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
  );
}
