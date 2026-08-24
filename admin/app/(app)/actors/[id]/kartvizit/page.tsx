import { notFound } from "next/navigation";
import { KartvizitActions } from "@/components/kartvizit-actions";
import { KartvizitCard } from "@/components/kartvizit-card";
import { kartvizitFields, kartvizitPhotos } from "@/lib/kartvizit";
import { fetchActorDetail } from "@/lib/queries";
import { requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await fetchActorDetail(id);
  const name = profile?.full_name?.trim() || "Oyuncu";
  return { title: `${name} · Kartvizit` };
}

export default async function ActorKartvizitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminPerm("actors");
  const { profile, actor, photos } = await fetchActorDetail(id);
  if (!profile) notFound();

  const name = (profile.full_name ?? "").trim().toLocaleUpperCase("tr-TR");

  return (
    <div className="kartvizit-page space-y-4">
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        @media print {
          aside, .no-print { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          body { background: #fff !important; }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">Kartvizit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            PDF indir yazdır penceresini açar. Hedef olarak “PDF olarak kaydet”
            seçin.
          </p>
        </div>
        <KartvizitActions actorId={profile.id} />
      </div>

      <div className="kartvizit-frame">
        <KartvizitCard
          name={name}
          fields={kartvizitFields(actor)}
          photos={kartvizitPhotos(photos)}
        />
      </div>
    </div>
  );
}
