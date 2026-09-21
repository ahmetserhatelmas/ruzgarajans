import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { markAdminAlertReadAction, markAllAdminAlertsReadAction } from "@/lib/actions";
import { formatDate } from "@/lib/labels";
import { fetchAdminAlerts } from "@/lib/queries";
import { requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  await requireAdminPerm("applications");
  const alerts = await fetchAdminAlerts();
  const unread = alerts.filter((alert) => !alert.read_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bildirimler"
        description="Tanıtım yaptığın oyuncu aynı ilana kendi başvurursa burada görünür."
        actions={
          unread ? (
            <form action={markAllAdminAlertsReadAction}>
              <Button type="submit" variant="outline">
                Tümünü okundu yap
              </Button>
            </form>
          ) : null
        }
      />

      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz bildirim yok.</p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => {
            const href = alert.application_id
              ? `/applications/${alert.application_id}`
              : alert.actor_id
                ? `/actors/${alert.actor_id}`
                : "/applications";
            return (
              <li
                key={alert.id}
                className={`rounded-xl p-4 ring-1 ring-foreground/10 ${
                  alert.read_at ? "bg-card" : "bg-primary/5 ring-primary/20"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {!alert.read_at ? (
                      <p className="mb-1 text-xs font-medium text-primary">Yeni</p>
                    ) : null}
                    <p className="font-medium">{alert.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{alert.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDate(alert.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={href}>Başvuruyu aç</Link>
                    </Button>
                    {!alert.read_at ? (
                      <form action={markAdminAlertReadAction}>
                        <input type="hidden" name="alert_id" value={alert.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Okundu
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
