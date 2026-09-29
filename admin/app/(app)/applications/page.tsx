import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/page-skeleton";
import {
  fetchIntroducedApplicationIds,
  fetchApplications,
  fetchCastFilterOptions,
} from "@/lib/queries";
import { APP_STATUS } from "@/lib/labels";
import type { Application, ApplicationStatus, CastListing, Profile } from "@/lib/types";
import { canAdmin, requireAdminPerm } from "@/lib/permissions";
import { ApplicationsExcelButton } from "@/components/applications-excel";
import { applicationExcelRow } from "@/lib/export-application";
import { fetchActiveApplicationShares, shareUrlMap } from "@/lib/share";
import { ApplicationsBrowser } from "./applications-browser";

export const dynamic = "force-dynamic";

type AppRow = Application & {
  profiles: Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "actor_status"> | null;
  cast_listings: Pick<
    CastListing,
    "id" | "project_name" | "role_name" | "deadline" | "budget_amount" | "budget_currency"
  > | null;
};

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; cast?: string; share?: string; shared?: string }>;
}) {
  const params = await searchParams;
  return (
    <div>
      <PageHeader
        title="Başvurular"
        description="Durum ve ilana göre filtrele, detayda audition videosunu izle."
      />
      <Suspense fallback={<TableSkeleton />}>
        <ApplicationsBody params={params} />
      </Suspense>
    </div>
  );
}

async function ApplicationsBody({
  params,
}: {
  params: { q?: string; status?: string; cast?: string; share?: string; shared?: string };
}) {
  const { profile } = await requireAdminPerm("applications");
  const canExport = canAdmin(profile, "export_applications");
  const { q = "", status = "all", cast = "all", share, shared } = params;
  const [apps, casts] = await Promise.all([fetchApplications(), fetchCastFilterOptions()]);
  const filtered = apps.filter((a) => {
    const hay = `${a.profiles?.full_name ?? ""} ${a.profiles?.email ?? ""} ${a.cast_listings?.project_name ?? ""} ${a.cast_listings?.role_name ?? ""}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (status !== "all" && a.status !== status) return false;
    if (cast !== "all" && a.cast_id !== cast) return false;
    return true;
  });
  const shareNames = Object.fromEntries(
    filtered.map((a) => [
      a.id,
      `${a.profiles?.full_name || a.profiles?.email || "Oyuncu"}${
        a.cast_listings?.role_name ? ` · ${a.cast_listings.role_name}` : ""
      }`,
    ]),
  );

  return (
    <>
      {canExport ? (
        <div className="mb-4 flex justify-end">
          <ApplicationsExcelButton
            filename={`basvurular-${new Date().toISOString().slice(0, 10)}.xlsx`}
            rows={filtered.map((a) => applicationExcelRow(a, a.profiles, a.cast_listings))}
          />
        </div>
      ) : null}
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
      <Suspense
        fallback={
          <ApplicationsBrowser
            apps={filtered}
            shares={[]}
            shareUrls={{}}
            shareNames={shareNames}
            sharedToken={shared}
            shareError={share}
            canExport={canExport}
          />
        }
      >
        <ApplicationsWithShares
          apps={filtered}
          shareNames={shareNames}
          shared={shared}
          share={share}
          canExport={canExport}
        />
      </Suspense>
    </>
  );
}

async function ApplicationsWithShares({
  apps,
  shareNames,
  shared,
  share,
  canExport,
}: {
  apps: AppRow[];
  shareNames: Record<string, string>;
  shared?: string;
  share?: string;
  canExport: boolean;
}) {
  const [shares, introducedApplyIds] = await Promise.all([
    fetchActiveApplicationShares(),
    fetchIntroducedApplicationIds(),
  ]);
  const shareUrls = await shareUrlMap(shares);
  return (
    <ApplicationsBrowser
      apps={apps}
      shares={shares}
      shareUrls={shareUrls}
      shareNames={shareNames}
      sharedToken={shared}
      shareError={share}
      canExport={canExport}
      introducedApplyIds={introducedApplyIds}
    />
  );
}
