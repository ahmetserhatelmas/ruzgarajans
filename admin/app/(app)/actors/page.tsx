import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/page-skeleton";
import { fetchActorRows } from "@/lib/queries";
import { ActorsBrowser } from "./actors-browser";
import { canAdmin, requireAdminPerm } from "@/lib/permissions";
import { fetchActiveActorShares, shareUrlMap } from "@/lib/share";

export const dynamic = "force-dynamic";

export default function ActorsPage() {
  return (
    <div>
      <PageHeader
        title="Oyuncular"
        description="Durum, fiziksel özellik, form ve medya üzerinden filtrele."
      />
      <Suspense fallback={<TableSkeleton />}>
        <ActorsBody />
      </Suspense>
    </div>
  );
}

async function ActorsBody() {
  const { profile } = await requireAdminPerm("actors");
  const [rows, shares] = await Promise.all([fetchActorRows(), fetchActiveActorShares()]);
  const shareUrls = await shareUrlMap(shares);
  const shareNames = Object.fromEntries(
    rows.map((row) => [row.profile.id, row.profile.full_name || row.profile.email || "Oyuncu"])
  );
  return (
    <ActorsBrowser
      rows={rows}
      shares={shares}
      shareUrls={shareUrls}
      shareNames={shareNames}
      canExport={canAdmin(profile, "export_actors")}
      canApprove={canAdmin(profile, "actor_approvals")}
      canDelete={canAdmin(profile, "delete_accounts")}
    />
  );
}
