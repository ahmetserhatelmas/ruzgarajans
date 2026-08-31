"use client";

import { useState } from "react";
import { DialogueEditor } from "@/components/dialogue-editor";

export function CastVideoOption({
  defaultChecked = true,
  defaultScript,
}: {
  defaultChecked?: boolean;
  defaultScript?: string | null;
}) {
  const [on, setOn] = useState(defaultChecked);

  return (
    <div className="grid gap-3 rounded-xl border border-border p-4">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="requires_video"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Video ekleme (Oyun Ver)</span>
          <span className="mt-1 block text-muted-foreground">
            Açıkken başvuranlar audition videosu çeker veya yükler. Kapatırsan
            yalnızca normal başvuru kalır.
          </span>
        </span>
      </label>
      {on ? (
        <div className="grid gap-1.5">
          <p className="text-sm font-medium">Diyalog / senaryo</p>
          <DialogueEditor defaultValue={defaultScript} />
        </div>
      ) : null}
    </div>
  );
}
