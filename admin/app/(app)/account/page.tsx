import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnPasswordAction } from "@/lib/actions";
import { requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireAdminPerm();
  const { error, ok } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hesabım"
        description="Admin paneli giriş şifreni buradan değiştir."
      />
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Şifre değiştir</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {decodeURIComponent(error)}
            </p>
          ) : null}
          {ok ? (
            <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {decodeURIComponent(ok)}
            </p>
          ) : null}
          <form action={updateOwnPasswordAction} className="grid gap-4">
            <input type="hidden" name="next" value="/account" />
            <div className="grid gap-2">
              <Label htmlFor="password">Yeni şifre</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password_confirm">Şifre tekrar</Label>
              <Input
                id="password_confirm"
                name="password_confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit">Şifreyi kaydet</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
