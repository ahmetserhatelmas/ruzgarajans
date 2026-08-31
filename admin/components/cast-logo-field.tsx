"use client";

import { useState } from "react";
import { displayImageUrl } from "@/lib/media";

export function CastLogoField({ defaultUrl }: { defaultUrl?: string | null }) {
  const initial = displayImageUrl(defaultUrl, 240) ?? defaultUrl ?? "";
  const [preview, setPreview] = useState(initial);
  const [removed, setRemoved] = useState(false);

  return (
    <div className="grid shrink-0 justify-items-center gap-2 self-start">
      <label className="relative size-24 cursor-pointer">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-muted text-xs text-muted-foreground ring-1 ring-foreground/15">
          {preview && !removed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <span>Logo</span>
          )}
        </div>
        <input
          type="file"
          name="logo"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setRemoved(false);
            setPreview(URL.createObjectURL(file));
          }}
        />
      </label>
      <p className="max-w-24 text-center text-xs text-muted-foreground">Şirket logosu</p>
      {defaultUrl && !removed ? (
        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => {
            setRemoved(true);
            setPreview("");
          }}
        >
          Kaldır
        </button>
      ) : null}
      {removed ? <input type="hidden" name="remove_logo" value="on" /> : null}
    </div>
  );
}
