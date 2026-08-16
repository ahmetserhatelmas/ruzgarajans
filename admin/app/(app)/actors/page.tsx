import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { fetchActorRows } from "@/lib/queries";
import { ActorsBrowser } from "./actors-browser";

export const dynamic = "force-dynamic";

export default async function ActorsPage() {
  const rows = await fetchActorRows();
  return (
    <div>
      <PageHeader
        title="Oyuncular"
        description="Durum, fiziksel özellik, form ve medya üzerinden filtrele."
      />
      <Suspense>
        <ActorsBrowser rows={rows} />
      </Suspense>
    </div>
  );
}
