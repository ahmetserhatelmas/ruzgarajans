"use client";

import { useState } from "react";
import { createActorShareAction, revokeActorShareAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { sharePinLabel, shareRemainingLabel } from "@/lib/share-label";
import type { ActorShare, Profile } from "@/lib/types";

function shareWhatsAppText(url: string, pin: string) {
  return `Oyuncu dosyası:\n${url}\n\nAçılış şifresi: ${pin}\n(Şifreyi linkin içine yazma, sayfada sorunca gir.)`;
}

export function ShareActorPanel({
  actorId,
  shares,
  directors,
  urls,
  pinError,
}: {
  actorId: string;
  shares: ActorShare[];
  directors: Pick<Profile, "id" | "full_name" | "email">[];
  urls: Record<string, string>;
  pinError?: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [pin, setPin] = useState("");

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <p className="font-medium">Cast direktörüne paylaş</p>
        <p className="text-sm text-muted-foreground">
          4 haneli şifre ve süre koy. WhatsApp’tan atınca karşı taraf giriş yapmaz, şifreyi yazar.
        </p>
        {pinError ? (
          <p className="mt-2 text-sm text-destructive">Link için 4 haneli şifre yaz.</p>
        ) : null}
      </div>
      <form action={createActorShareAction} className="grid gap-3">
        <input type="hidden" name="actor_id" value={actorId} />
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Alıcı</span>
          <select
            name="recipient_id"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue=""
          >
            <option value="">Sadece link (alıcı yok)</option>
            {directors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name || d.email}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">4 haneli şifre</span>
            <input
              name="pin"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              pattern="\d{4}"
              required
              placeholder="6060"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-10 w-full rounded-md border border-input bg-background px-4 text-center text-lg tracking-[0.3em] [text-indent:0.3em]"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Geçerlilik süresi</span>
            <select
              name="ttl"
              defaultValue="1d"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="1d">1 gün</option>
              <option value="7d">7 gün</option>
              <option value="forever">Süresiz</option>
            </select>
          </label>
        </div>
        <Button type="submit" className="h-10 w-full sm:w-auto">
          Link oluştur
        </Button>
      </form>
      {shares.length ? (
        <ul className="space-y-3">
          {shares.map((share) => {
            const url = urls[share.id] ?? "";
            const savedPin = sharePinLabel(share);
            const waText = savedPin ? shareWhatsAppText(url, savedPin) : url;
            return (
              <li key={share.id} className="space-y-2 rounded-lg border border-border px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
                  <p className="text-muted-foreground">
                    {shareRemainingLabel(share.expires_at)}
                    {savedPin ? ` · şifre ${savedPin}` : ""}
                  </p>
                  <form action={revokeActorShareAction}>
                    <input type="hidden" name="share_id" value={share.id} />
                    <input type="hidden" name="actor_id" value={actorId} />
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
                  {savedPin ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void copy(savedPin, `${share.id}-pin`)}
                    >
                      {copied === `${share.id}-pin` ? "Kopyalandı" : `Şifre ${savedPin}`}
                    </Button>
                  ) : null}
                  {url ? (
                    <Button asChild variant="outline">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
