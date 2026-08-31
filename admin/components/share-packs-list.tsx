"use client";

import { useState } from "react";
import { revokeActorShareAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { shareActorIds, sharePinLabel, shareRemainingLabel } from "@/lib/share-label";
import type { ActorShare } from "@/lib/types";

export function SharePacksList({
  shares,
  urls,
  names,
  highlightToken,
}: {
  shares: ActorShare[];
  urls: Record<string, string>;
  names: Record<string, string>;
  highlightToken?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (shares.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div>
        <p className="font-medium">Şifreli linkler</p>
        <p className="text-sm text-muted-foreground">
          Linki ve şifreyi ayrı at. Süresi bitenler otomatik silinir.
        </p>
      </div>
      <ul className="space-y-3">
        {shares.map((share) => {
          const url = urls[share.id] ?? "";
          const pin = sharePinLabel(share);
          const ids = shareActorIds(share);
          const people = ids.map((id) => names[id] || "Oyuncu").filter(Boolean);
          const highlighted = highlightToken && share.token === highlightToken;
          return (
            <li
              key={share.id}
              className={`space-y-2 rounded-lg border px-3 py-3 ${
                highlighted ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {people.length ? people.slice(0, 4).join(", ") : "Paket"}
                    {people.length > 4 ? ` +${people.length - 4}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {ids.length} profil · {shareRemainingLabel(share.expires_at)}
                    {pin ? ` · şifre ${pin}` : ""}
                  </p>
                </div>
                <form action={revokeActorShareAction}>
                  <input type="hidden" name="share_id" value={share.id} />
                  <input type="hidden" name="actor_id" value={share.actor_id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Sil
                  </Button>
                </form>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={url}
                  className="h-10 flex-1 rounded-md border border-input bg-muted px-3 text-xs"
                />
                <Button type="button" variant="outline" onClick={() => void copy(url, share.id)}>
                  {copied === share.id ? "Kopyalandı" : "Linki kopyala"}
                </Button>
                {pin ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void copy(pin, `${share.id}-pin`)}
                  >
                    {copied === `${share.id}-pin` ? "Kopyalandı" : `Şifre ${pin}`}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
