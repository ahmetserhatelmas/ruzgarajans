import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { removeDirectorRoleAction, setDirectorRoleAction } from "@/lib/actions";
import { fetchDirectors } from "@/lib/share";
import { requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function DirectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireAdminPerm("directors");
  const directors = await fetchDirectors();
  const { error, ok } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cast direktörleri"
        description="Seçtiğin kişiler uygulamadan giriş yapınca yalnızca kendilerine paylaşılan oyuncu dosyalarını görür. Admin paneline giremezler."
      />

      <Card>
        <CardHeader>
          <CardTitle>Direktör ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Kişi önce mobil uygulamadan e-posta ile üye olsun. Sonra e-postasını buraya yaz.
          </p>
          {error ? (
            <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {ok}
            </p>
          ) : null}
          <form action={setDirectorRoleAction} className="flex flex-col gap-2 sm:flex-row">
            <input
              name="email"
              type="email"
              required
              placeholder="direktör@ornek.com"
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            />
            <Button type="submit">Rolü ver</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kayıtlı direktörler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {directors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz direktör yok.</p>
          ) : (
            directors.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{d.full_name || "—"}</p>
                  <p className="text-muted-foreground">{d.email}</p>
                </div>
                <form action={removeDirectorRoleAction}>
                  <input type="hidden" name="user_id" value={d.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Rolü al
                  </Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
