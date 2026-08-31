import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { fetchApplications, fetchCasts } from "@/lib/queries";
import { APP_STATUS } from "@/lib/labels";
import type { ApplicationStatus } from "@/lib/types";
import { canAdmin, requireAdminPerm } from "@/lib/permissions";
import { ApplicationsExcelButton } from "@/components/applications-excel";
import { applicationExcelRow } from "@/lib/export-application";
import { fetchActiveApplicationShares, sharePublicUrl } from "@/lib/share";
import { ApplicationsBrowser } from "./applications-browser";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; cast?: string; share?: string; shared?: string }>;
}) {
  const { profile } = await requireAdminPerm("applications");
  const canExport = canAdmin(profile, "export_applications");
  const { q = "", status = "all", cast = "all", share, shared } = await searchParams;
  const [apps, casts, shares] = await Promise.all([
    fetchApplications(),
    fetchCasts(),
    fetchActiveApplicationShares(),
  ]);
  const shareUrls: Record<string, string> = {};
  await Promise.all(
    shares.map(async (item) => {
      shareUrls[item.id] = await sharePublicUrl(item.token);
    })
  );
  const filtered = apps.filter((a) => {
    const hay = `${a.profiles?.full_name ?? ""} ${a.profiles?.email ?? ""} ${a.cast_listings?.project_name ?? ""} ${a.cast_listings?.role_name ?? ""}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (status !== "all" && a.status !== status) return false;
    if (cast !== "all" && a.cast_id !== cast) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Başvurular"
        description="Durum ve ilana göre filtrele, detayda audition videosunu izle."
        actions={
          canExport ? (
            <ApplicationsExcelButton
              filename={`basvurular-${new Date().toISOString().slice(0, 10)}.xlsx`}
              rows={filtered.map((a) => applicationExcelRow(a, a.profiles, a.cast_listings))}
            />
          ) : null
        }
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Oyuncu veya proje"
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="all">Tüm durumlar</option>
          {(Object.keys(APP_STATUS) as ApplicationStatus[]).map((s) => (
            <option key={s} value={s}>
              {APP_STATUS[s]}
            </option>
          ))}
        </select>
        <select
          name="cast"
          defaultValue={cast}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="all">Tüm ilanlar</option>
          {casts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.project_name} · {c.role_name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrele
        </Button>
      </form>
      <ApplicationsBrowser
        apps={filtered}
        shares={shares}
        shareUrls={shareUrls}
        shareNames={Object.fromEntries(
          filtered.map((a) => [
            a.id,
            `${a.profiles?.full_name || a.profiles?.email || "Oyuncu"}${
              a.cast_listings?.role_name ? ` · ${a.cast_listings.role_name}` : ""
            }`,
          ])
        )}
        sharedToken={shared}
        shareError={share}
        canExport={canExport}
      />
    </div>
  );
}
