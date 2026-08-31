"use client";

import { KartvizitCard } from "@/components/kartvizit-card";
import { kartvizitFields, kartvizitPhotos } from "@/lib/kartvizit";
import type { SharedActorPayload } from "@/lib/types";

export function ShareKartvizit({ item }: { item: SharedActorPayload }) {
  const name = (item.profile.full_name ?? "").trim().toLocaleUpperCase("tr-TR") || "OYUNCU";

  return (
    <div className="kartvizit-frame">
      <KartvizitCard name={name} fields={kartvizitFields(item.actor)} photos={kartvizitPhotos(item.photos)} />
    </div>
  );
}
