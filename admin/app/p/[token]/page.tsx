import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { ShareActorFile } from "@/components/share-actor-file";
import { ShareApplicationFile } from "@/components/share-application-file";
import { SharePinGate } from "@/components/share-pin-gate";
import { fetchSharedActor, fetchSharedApplication, readSharePinCookie } from "@/lib/share";
import { parseShareInput } from "@/lib/share-pin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SharedActorPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  noStore();
  const { token: rawToken } = await params;
  const { e } = await searchParams;
  const parsed = parseShareInput(rawToken);
  if (parsed.token && parsed.token !== rawToken) {
    redirect(`/p/${parsed.token}`);
  }
  const token = parsed.token || rawToken;
  const pin = await readSharePinCookie(token);
  const actors = await fetchSharedActor(token, pin);
  const applications =
    actors.status === "unavailable" ? await fetchSharedApplication(token, pin) : null;
  const opened = actors.status !== "unavailable" ? actors : applications;

  if (!opened || opened.status === "unavailable") {
    return <SharePinGate token={token} error="expired" />;
  }

  if (opened.status !== "ok") {
    return <SharePinGate token={token} error={e === "pin" || opened.status === "bad_pin" ? "pin" : null} />;
  }

  const isApplication = applications?.status === "ok";
  const items = opened.items;
  const many = items.length > 1;

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-background px-4 py-8">
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          .share-file { display: none !important; }
          .kartvizit-frame { overflow: visible; padding: 0; background: transparent; }
        }
      `}</style>
      <p className="font-heading text-2xl">Rüzgar Oyunculuk</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {isApplication
          ? many
            ? `${items.length} başvuru · şifreli paket`
            : "Başvuru dosyası · yalnızca bu başvuru"
          : many
            ? `${items.length} oyuncu dosyası · şifreli paket`
            : "Oyuncu dosyası · yalnızca bu profil"}
      </p>
      {many ? (
        <nav className="mt-6 mb-8 rounded-2xl bg-card p-4 ring-1 ring-border">
          <p className="mb-2 text-sm font-medium">Dosyalar</p>
          <ol className="grid gap-1 text-sm">
            {isApplication && applications?.status === "ok"
              ? applications.items.map((item, index) => (
                  <li key={item.application.id}>
                    <a className="text-primary hover:underline" href={`#basvuru-${item.application.id}`}>
                      {index + 1}. {item.profile?.full_name || "Oyuncu"}
                      {item.listing?.role_name ? ` · ${item.listing.role_name}` : ""}
                    </a>
                  </li>
                ))
              : actors.status === "ok"
                ? actors.items.map((item, index) => (
                    <li key={item.profile.id}>
                      <a className="text-primary hover:underline" href={`#oyuncu-${item.profile.id}`}>
                        {index + 1}. {item.profile.full_name || "Oyuncu"}
                      </a>
                    </li>
                  ))
                : null}
          </ol>
        </nav>
      ) : null}
      <div className="space-y-16">
        {isApplication && applications?.status === "ok"
          ? applications.items.map((item) => (
              <section key={item.application.id} id={`basvuru-${item.application.id}`}>
                <ShareApplicationFile item={item} />
              </section>
            ))
          : actors.status === "ok"
            ? actors.items.map((item) => (
                <section key={item.profile.id} id={`oyuncu-${item.profile.id}`}>
                  <ShareActorFile item={item} />
                </section>
              ))
            : null}
      </div>
    </div>
  );
}
