"use client";

import { useMemo, useState } from "react";
import { introduceActorToCastAction, removeCastIntroductionAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";

type ActorOption = {
  id: string;
  name: string;
};

export function IntroduceButton({
  castId,
  actorId,
  introduced,
}: {
  castId: string;
  actorId: string;
  introduced: boolean;
}) {
  if (introduced) {
    return (
      <form action={removeCastIntroductionAction.bind(null, castId, actorId)}>
        <Button type="submit" size="sm" variant="outline">
          Tanıtıldı · kaldır
        </Button>
      </form>
    );
  }
  return (
    <form action={introduceActorToCastAction.bind(null, castId, actorId)}>
      <Button type="submit" size="sm">
        Tanıt
      </Button>
    </form>
  );
}

export function CastIntroducePicker({
  castId,
  actors,
  introducedIds,
}: {
  castId: string;
  actors: ActorOption[];
  introducedIds: string[];
}) {
  const [q, setQ] = useState("");
  const introduced = useMemo(() => new Set(introducedIds), [introducedIds]);
  const matches = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    if (needle.length < 2) return [];
    return actors
      .filter((a) => !introduced.has(a.id) && a.name.toLocaleLowerCase("tr").includes(needle))
      .slice(0, 12);
  }, [actors, introduced, q]);

  return (
    <div className="space-y-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Uyan listede yoksa isimle ara…"
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      {matches.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <span className="min-w-0 truncate">{a.name}</span>
          <IntroduceButton castId={castId} actorId={a.id} introduced={false} />
        </div>
      ))}
    </div>
  );
}
