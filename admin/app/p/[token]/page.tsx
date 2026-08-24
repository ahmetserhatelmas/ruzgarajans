import { ActorPortfolio } from "@/components/actor-portfolio";
import { SharePinGate } from "@/components/share-pin-gate";
import { fetchSharedActor, readSharePinCookie } from "@/lib/share";

export const dynamic = "force-dynamic";

export default async function SharedActorPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { token } = await params;
  const { e } = await searchParams;
  const pin = await readSharePinCookie(token);
  const opened = await fetchSharedActor(token, pin);

  if (opened.status === "unavailable") {
    return <SharePinGate token={token} error="expired" />;
  }

  if (opened.status !== "ok") {
    return <SharePinGate token={token} error={e === "pin" || opened.status === "bad_pin" ? "pin" : null} />;
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-background px-4 py-8">
      <p className="font-heading text-2xl">Rüzgâr Oyunculuk</p>
      <p className="mt-1 text-sm text-muted-foreground">Oyuncu dosyası · yalnızca bu profil</p>
      <h1 className="mt-6 mb-6 font-heading text-3xl">{opened.data.profile.full_name || "Oyuncu"}</h1>
      <ActorPortfolio data={opened.data} />
    </div>
  );
}
