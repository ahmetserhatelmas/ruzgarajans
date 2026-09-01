import { optionActorForCastFormAction, removeCastOptionAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptionStatusBadge } from "@/components/cast-option";
import type { CastListing, CastOption } from "@/lib/types";

export function ActorOptionCast({
  actorId,
  casts,
  options,
}: {
  actorId: string;
  casts: Pick<CastListing, "id" | "project_name" | "role_name" | "is_published">[];
  options: (CastOption & {
    cast_listings: Pick<CastListing, "id" | "project_name" | "role_name"> | null;
  })[];
}) {
  const optionedIds = new Set(options.map((row) => row.cast_id));
  const available = casts.filter((c) => c.is_published && !optionedIds.has(c.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opsiyon isteği</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Oyuncuya bildirim gider. İlanı açıp evet / hayır der; cevabı burada görünür.
        </p>
        {available.length > 0 ? (
          <form action={optionActorForCastFormAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="actor_id" value={actorId} />
            <select
              name="cast_id"
              required
              className="h-10 min-w-0 w-full flex-1 rounded-md border border-input bg-background px-3 text-sm"
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
            <Button type="submit">Opsiyonla</Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Yayında opsiyonlanmamış ilan yok.</p>
        )}
        {options.length > 0 ? (
          <div className="space-y-2">
            {options.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {row.cast_listings?.project_name ?? "İlan"} · {row.cast_listings?.role_name ?? ""}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <OptionStatusBadge status={row.status} />
                  {row.status === "pending" ? (
                    <form action={removeCastOptionAction.bind(null, row.cast_id, actorId)}>
                      <Button type="submit" size="sm" variant="outline">
                        İptal
                      </Button>
                    </form>
                  ) : (
                    <form action={optionActorForCastFormAction}>
                      <input type="hidden" name="actor_id" value={actorId} />
                      <input type="hidden" name="cast_id" value={row.cast_id} />
                      <Button type="submit" size="sm" variant="outline">
                        Tekrar sor
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
