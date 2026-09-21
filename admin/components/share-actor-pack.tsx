"use client";

import { useState } from "react";
import { BrandedVideo } from "@/components/branded-video";
import { ShareKartvizit } from "@/components/share-kartvizit";
import { Button } from "@/components/ui/button";
import { PHOTO_KIND } from "@/lib/labels";
import { displayImageUrl } from "@/lib/media";
import type { SharedActorPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

function chestSrc(item: SharedActorPayload) {
  const chest = item.photos.find((photo) => photo.kind === "chest");
  return (
    displayImageUrl(chest?.public_url, 600) ??
    chest?.public_url ??
    displayImageUrl(item.profile.avatar_url)
  );
}

function introUrl(item: SharedActorPayload) {
  return (
    item.actor?.intro_video_playback_url ||
    item.videos.find((video) => video.kind === "intro" && video.playback_url)?.playback_url ||
    null
  );
}

function favoritePhotos(item: SharedActorPayload) {
  return item.photos.filter((photo) => photo.kind === "favorite_1" || photo.kind === "favorite_2");
}

export function ShareActorPack({ items }: { items: SharedActorPayload[] }) {
  const [selectedId, setSelectedId] = useState(items[0]?.profile.id ?? "");
  const item = items.find((row) => row.profile.id === selectedId) ?? items[0];
  if (!item) return null;

  const name = item.profile.full_name || "Oyuncu";
  const video = introUrl(item);
  const extras = favoritePhotos(item);

  return (
    <div className="mt-6 space-y-10">
      <nav className="no-print">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {items.map((row) => {
            const photo = chestSrc(row);
            const label = row.profile.full_name || "Oyuncu";
            const active = row.profile.id === item.profile.id;
            return (
              <button
                key={row.profile.id}
                type="button"
                onClick={() => setSelectedId(row.profile.id)}
                className="w-28 shrink-0 text-left sm:w-32"
              >
                <div
                  className={cn(
                    "aspect-[3/4] overflow-hidden rounded-xl bg-muted ring-2 ring-transparent",
                    active && "ring-primary",
                  )}
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      className="h-full w-full object-cover object-[center_18%]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
                      Fotoğraf yok
                    </div>
                  )}
                </div>
                <p className={cn("mt-2 text-sm font-medium leading-tight", active && "text-primary")}>
                  {label}
                </p>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="space-y-8">
        <div className="no-print">
          <h2 className="font-heading text-3xl tracking-tight">{name}</h2>
        </div>

        <section className="no-print space-y-3">
          <h3 className="text-lg font-semibold">Tanıtım videosu</h3>
          {video ? (
            <BrandedVideo src={video} className="max-w-2xl" />
          ) : (
            <p className="text-sm text-muted-foreground">Tanıtım videosu yok.</p>
          )}
        </section>

        <section className="space-y-3">
          <div className="no-print flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Setcard</h3>
            <Button type="button" onClick={() => window.print()}>
              Setcard yazdır / PDF
            </Button>
          </div>
          <ShareKartvizit item={item} />
        </section>

        {extras.length ? (
          <section className="no-print space-y-3">
            <h3 className="text-lg font-semibold">Beğendiğin fotoğraflar</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {extras.map((photo) => {
                const src = displayImageUrl(photo.public_url, 900) ?? photo.public_url;
                return (
                  <figure key={photo.id} className="space-y-2">
                    <a href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-auto w-full object-contain" />
                    </a>
                    <figcaption className="text-sm text-muted-foreground">
                      {PHOTO_KIND[photo.kind ?? ""] ?? "Fotoğraf"}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
