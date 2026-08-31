"use client";

import { useMemo, useState } from "react";
import {
  optionActorForCastAction,
  removeCastOptionAction,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CastOptionStatus } from "@/lib/types";

type ActorOption = {
  id: string;
  name: string;
};

const STATUS_LABEL: Record<CastOptionStatus, string> = {
  pending: "Bekliyor",
  accepted: "Evet",
  declined: "Hayır",
};

export function OptionStatusBadge({ status }: { status: CastOptionStatus }) {
  const variant =
    status === "accepted" ? "default" : status === "pending" ? "secondary" : "destructive";
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}

export function OptionButton({
  castId,
  actorId,
  status,
}: {
  castId: string;
  actorId: string;
  status?: CastOptionStatus | null;
}) {
  if (!status) {
    return (
      <form action={optionActorForCastAction.bind(null, castId, actorId)}>
        <Button type="submit" size="sm">
          Opsiyonla
        </Button>
      </form>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-2">
      <OptionStatusBadge status={status} />
      {status === "pending" ? (
        <form action={removeCastOptionAction.bind(null, castId, actorId)}>
          <Button type="submit" size="sm" variant="outline">
            İptal
          </Button>
        </form>
      ) : (
        <form action={optionActorForCastAction.bind(null, castId, actorId)}>
          <Button type="submit" size="sm" variant="outline">
            Tekrar sor
          </Button>
        </form>
      )}
    </div>
  );
}

export function CastOptionPicker({
  castId,
  actors,
  optionedIds,
}: {
  castId: string;
  actors: ActorOption[];
  optionedIds: string[];
}) {
  const [q, setQ] = useState("");
  const optioned = useMemo(() => new Set(optionedIds), [optionedIds]);
  const matches = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    if (needle.length < 2) return [];
    return actors
      .filter((a) => !optioned.has(a.id) && a.name.toLocaleLowerCase("tr").includes(needle))
      .slice(0, 12);
  }, [actors, optioned, q]);

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
          <OptionButton castId={castId} actorId={a.id} />
        </div>
      ))}
    </div>
  );
}
