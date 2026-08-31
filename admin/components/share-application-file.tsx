import { ShareActorFile } from "@/components/share-actor-file";
import { BrandedVideo } from "@/components/branded-video";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppStatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney } from "@/lib/labels";
import type { SharedApplicationPayload } from "@/lib/types";

export function ShareApplicationFile({ item }: { item: SharedApplicationPayload }) {
  const listing = item.listing;
  const app = item.application;
  const project = listing?.project_name || "Başvuru";
  const role = listing?.role_name;
  const auditions = (item.auditions ?? []).filter((video) => video.playback_url);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">{project}</h1>
        {role ? <p className="mt-1 text-muted-foreground">{role}</p> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Başvuru detayı</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <AppStatusBadge status={app.status} />
            <span className="text-muted-foreground">{formatDate(app.created_at)}</span>
          </div>
          {listing?.role_description ? <p>{listing.role_description}</p> : null}
          <p>Son tarih: {formatDate(listing?.deadline)}</p>
          <p>Opsiyon tarihi: {formatDate(listing?.option_date)}</p>
          <p>Bütçe: {formatMoney(listing?.budget_amount, listing?.budget_currency ?? undefined)}</p>
          <p>
            Oyuncu bütçesi:{" "}
            {app.accept_budget ? "Kabul etti" : formatMoney(app.counter_budget)}
          </p>
          {app.note ? <p>Not: {app.note}</p> : null}
        </CardContent>
      </Card>

      {auditions.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Audition videoları ({auditions.length})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {auditions.map((video) => (
              <BrandedVideo key={video.id} src={video.playback_url!} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {item.profile ? <ShareActorFile item={item} /> : null}
    </div>
  );
}
