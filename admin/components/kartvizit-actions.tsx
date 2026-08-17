"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function KartvizitActions({ actorId }: { actorId: string }) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button asChild variant="outline">
        <Link href={`/actors/${actorId}`}>Geri</Link>
      </Button>
      <Button type="button" onClick={() => window.print()}>
        PDF indir
      </Button>
    </div>
  );
}
