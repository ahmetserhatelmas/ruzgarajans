"use client";

import { useState } from "react";
import { createActorShareAction, revokeActorShareAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import type { ActorShare, Profile } from "@/lib/types";

function shareWhatsAppText(url: string, pin: string) {
  return `${url}\n\nŞifre: ${pin}`;
}

function expiryLabel(expiresAt: string | null) {
  if (!expiresAt) return "Süresiz";
  return `${new Date(expiresAt).toLocaleString("tr-TR")} tarihine kadar`;
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
  const [lastPin, setLastPin] = useState("");
  const latest = shares[0];
  const latestUrl = latest ? urls[latest.id] ?? "" : "";
  const waText = latestUrl && lastPin ? shareWhatsAppText(latestUrl, lastPin) : latestUrl;

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
      <form
        action={createActorShareAction}
        onSubmit={() => setLastPin(pin)}
        className="grid gap-3"
      >
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
              className="h-10 rounded-md border border-input bg-background px-3 text-center text-lg tracking-[0.4em]"
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
      {latest ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {expiryLabel(latest.expires_at)}
            {latest.pin_hash ? " · şifreli" : ""}
            {lastPin ? ` · şifre ${lastPin}` : ""}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={latestUrl}
              className="h-10 flex-1 rounded-md border border-input bg-muted px-3 text-xs"
            />
            <Button type="button" variant="outline" onClick={() => void copy(waText || latestUrl, latest.id)}>
              {copied === latest.id ? "Kopyalandı" : lastPin ? "Link + şifre" : "Kopyala"}
            </Button>
            {latestUrl ? (
              <Button asChild variant="outline">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(waText || latestUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
            ) : null}
            <form action={revokeActorShareAction}>
              <input type="hidden" name="share_id" value={latest.id} />
              <input type="hidden" name="actor_id" value={actorId} />
              <Button type="submit" variant="ghost">
                İptal
              </Button>
            </form>
          </div>
        </div>
      ) : null}
      {shares.length > 1 ? (
        <ul className="space-y-2 text-sm">
          {shares.slice(1).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2">
              <span className="truncate text-muted-foreground">
                {new Date(s.created_at).toLocaleString("tr-TR")}
                {" · "}
                {expiryLabel(s.expires_at)}
              </span>
              <form action={revokeActorShareAction}>
                <input type="hidden" name="share_id" value={s.id} />
                <input type="hidden" name="actor_id" value={actorId} />
                <Button type="submit" size="sm" variant="ghost">
                  İptal
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
