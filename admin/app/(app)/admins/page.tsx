import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ADMIN_PERM_GROUPS,
  ADMIN_PERM_LABELS,
  requireAdminPerm,
} from "@/lib/permissions";
import {
  removeAdminRoleAction,
  setAdminPasswordAction,
  setAdminRoleAction,
  updateAdminPermsAction,
} from "@/lib/actions";

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
        description="Yeni yönetici için e-posta ve şifre yaz. Kendi şifreni soldaki Şifre sayfasından değiştir."
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
              name="full_name"
              type="text"
              placeholder="Ad soyad"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="yonetici@ornek.com"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="Şifre (yeni hesapta zorunlu)"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="password_confirm"
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="Şifre tekrar"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="full" />
              Tam yetki — her şeyi görür ve diğer yöneticileri yönetir
            </label>
            {ADMIN_PERM_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.perms.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="perm" value={perm} defaultChecked />
                      {ADMIN_PERM_LABELS[perm]}
                    </label>
                  ))}
                </div>
              </div>
            ))}
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
            <div key={admin.id} className="space-y-3 rounded-lg border border-border p-3">
              <form action={updateAdminPermsAction} className="space-y-3">
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
                {ADMIN_PERM_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {group.title}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.perms.map((perm) => (
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
                  </div>
                ))}
                <Button type="submit" size="sm">
                  Yetkileri kaydet
                </Button>
              </form>
              <form action={setAdminPasswordAction} className="grid gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="user_id" value={admin.id} />
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Yeni şifre"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
                <input
                  name="password_confirm"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Şifre tekrar"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
                <Button type="submit" variant="outline" size="sm" className="h-10">
                  Şifre belirle
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
