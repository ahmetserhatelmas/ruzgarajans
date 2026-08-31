import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { fetchActorRows } from "@/lib/queries";
import { ActorsBrowser } from "./actors-browser";
import { canAdmin, requireAdminPerm } from "@/lib/permissions";
import { fetchActiveActorShares, sharePublicUrl } from "@/lib/share";

export const dynamic = "force-dynamic";

export default async function ActorsPage() {
  const { profile } = await requireAdminPerm("actors");
  const [rows, shares] = await Promise.all([fetchActorRows(), fetchActiveActorShares()]);
  const shareUrls: Record<string, string> = {};
  await Promise.all(
    shares.map(async (share) => {
      shareUrls[share.id] = await sharePublicUrl(share.token);
    })
  );
  const shareNames = Object.fromEntries(
    rows.map((row) => [row.profile.id, row.profile.full_name || row.profile.email || "Oyuncu"])
  );
  return (
    <div>
      <PageHeader
        title="Oyuncular"
        description="Durum, fiziksel özellik, form ve medya üzerinden filtrele."
      />
      <Suspense>
        <ActorsBrowser
          rows={rows}
          shares={shares}
          shareUrls={shareUrls}
          shareNames={shareNames}
          canExport={canAdmin(profile, "export_actors")}
          canApprove={canAdmin(profile, "actor_approvals")}
        />
      </Suspense>
    </div>
  );
}
