import { introduceActorToCastFormAction, removeCastIntroductionAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CastIntroduction, CastListing } from "@/lib/types";

export function ActorIntroduceCast({
  actorId,
  casts,
  introductions,
}: {
  actorId: string;
  casts: Pick<CastListing, "id" | "project_name" | "role_name" | "is_published">[];
  introductions: (CastIntroduction & {
    cast_listings: Pick<CastListing, "id" | "project_name" | "role_name"> | null;
  })[];
}) {
  const introducedIds = new Set(introductions.map((i) => i.cast_id));
  const available = casts.filter((c) => c.is_published && !introducedIds.has(c.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firmaya tanıt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Oyuncu ilanı açınca “Bu ilan için tanıtımınız yapıldı” görür. Yine de başvurabilir.
        </p>
        {available.length > 0 ? (
          <form action={introduceActorToCastFormAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="actor_id" value={actorId} />
            <select
              name="cast_id"
              required
              className="h-10 min-w-[220px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                İlan seç
              </option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.project_name} · {c.role_name}
                </option>
              ))}
            </select>
            <Button type="submit">Tanıt</Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Yayındaki tanıtılmamış ilan yok.</p>
        )}
        {introductions.length > 0 ? (
          <div className="space-y-2">
            {introductions.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  {row.cast_listings?.project_name ?? "İlan"} · {row.cast_listings?.role_name ?? ""}
                </span>
                <form action={removeCastIntroductionAction.bind(null, row.cast_id, actorId)}>
                  <Button type="submit" size="sm" variant="outline">
                    Kaldır
                  </Button>
                </form>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
