"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function KartvizitActions({
  actorId,
  canDownload = false,
}: {
  actorId: string;
  canDownload?: boolean;
}) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button asChild variant="outline">
        <Link href={`/actors/${actorId}`}>Geri</Link>
      </Button>
      {canDownload ? (
        <Button type="button" onClick={() => window.print()}>
          PDF indir
        </Button>
      ) : null}
    </div>
  );
}
