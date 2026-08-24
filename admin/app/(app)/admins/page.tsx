import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ADMIN_PERM_LABELS,
  ADMIN_PERMS,
  requireAdminPerm,
} from "@/lib/permissions";
import { removeAdminRoleAction, setAdminRoleAction, updateAdminPermsAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase } = await requireAdminPerm("admins");
  const { error, ok } = await searchParams;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, is_super_admin, admin_permissions")
    .eq("role", "admin")
    .order("full_name");
  const admins = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yöneticiler"
        description="Kişi önce mobil uygulamadan üye olsun. Sonra e-postasını yaz ve hangi bölümlere girebileceğini seç."
      />

      <Card>
        <CardHeader>
          <CardTitle>Yönetici ekle</CardTitle>
        </CardHeader>
        <CardContent>
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
          <form action={setAdminRoleAction} className="space-y-4">
            <input
              name="email"
              type="email"
              required
              placeholder="yonetici@ornek.com"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="full" />
              Tam yetki — her şeyi görür ve diğer yöneticileri yönetir
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {ADMIN_PERMS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="perm" value={perm} defaultChecked />
                  {ADMIN_PERM_LABELS[perm]}
                </label>
              ))}
            </div>
            <Button type="submit">Yetkiyi ver</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kayıtlı yöneticiler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {admins.map((admin) => (
            <form
              key={admin.id}
              action={updateAdminPermsAction}
              className="space-y-3 rounded-lg border border-border p-3"
            >
              <input type="hidden" name="user_id" value={admin.id} />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{admin.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{admin.email}</p>
                  {admin.is_super_admin ? (
                    <p className="mt-1 text-xs font-medium text-primary">Tam yetkili</p>
                  ) : null}
                </div>
                <Button formAction={removeAdminRoleAction} type="submit" variant="outline" size="sm">
                  Yetkiyi al
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="full" defaultChecked={Boolean(admin.is_super_admin)} />
                Tam yetki
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {ADMIN_PERMS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="perm"
                      value={perm}
                      defaultChecked={
                        Boolean(admin.is_super_admin) ||
                        (admin.admin_permissions ?? []).includes(perm)
                      }
                    />
                    {ADMIN_PERM_LABELS[perm]}
                  </label>
                ))}
              </div>
              <Button type="submit" size="sm">
                Yetkileri kaydet
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
