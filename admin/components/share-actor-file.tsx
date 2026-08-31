"use client";

import { useState } from "react";
import { ActorPortfolio } from "@/components/actor-portfolio";
import { ShareKartvizit } from "@/components/share-kartvizit";
import { Button } from "@/components/ui/button";
import { displayImageUrl } from "@/lib/media";
import type { SharedActorPayload } from "@/lib/types";

export function ShareActorFile({ item }: { item: SharedActorPayload }) {
  const [kartvizit, setKartvizit] = useState(false);
  const chest = item.photos.find((photo) => photo.kind === "chest");
  const chestSrc =
    displayImageUrl(chest?.public_url, 800) ??
    chest?.public_url ??
    displayImageUrl(item.profile.avatar_url);
  const name = item.profile.full_name || "Oyuncu";

  if (kartvizit) {
    return (
      <div>
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl">Kartvizit</h2>
            <p className="mt-1 text-sm text-muted-foreground">{name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setKartvizit(false)}>
              Geri
            </Button>
            <Button type="button" onClick={() => window.print()}>
              Kartviziti yazdır / PDF
            </Button>
          </div>
        </div>
        <ShareKartvizit item={item} />
      </div>
    );
  }

  return (
    <div className="share-file space-y-6">
      <div className="flex items-start gap-5">
        {chestSrc ? (
          <a
            href={chestSrc}
            target="_blank"
            rel="noreferrer"
            className="relative block aspect-[3/4] w-36 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 sm:w-40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={chestSrc} alt="" className="h-full w-full object-cover object-[center_18%]" />
          </a>
        ) : (
          <div className="flex aspect-[3/4] w-36 shrink-0 items-center justify-center rounded-xl bg-muted text-center text-xs text-muted-foreground ring-1 ring-foreground/10 sm:w-40">
            Fotoğraf yok
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-heading text-3xl tracking-tight">{name}</h1>
              {item.profile.email ? (
                <p className="mt-1 text-sm text-muted-foreground">{item.profile.email}</p>
              ) : null}
            </div>
            <Button type="button" onClick={() => setKartvizit(true)}>
              Kartvizit
            </Button>
          </div>
        </div>
      </div>
      <ActorPortfolio data={item} />
    </div>
  );
}
