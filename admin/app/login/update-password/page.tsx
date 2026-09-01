import { updateOwnPasswordAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? decodeURIComponent(error) : null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(107,44,145,0.14),transparent_55%)]" />
      <div className="relative w-full max-w-md rounded-3xl bg-card p-8 shadow-[0_24px_80px_rgba(14,24,40,0.06)] ring-1 ring-border sm:p-10">
        <h1 className="text-xl font-semibold text-foreground">Yeni şifre</h1>
        <p className="mt-1 mb-8 text-sm leading-6 text-muted-foreground">
          Admin paneline giriş için yeni bir şifre yaz.
        </p>
        {message ? (
          <p className="mb-5 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        ) : null}
        <form action={updateOwnPasswordAction} className="grid gap-5">
          <input type="hidden" name="next" value="/login/update-password" />
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-muted-foreground">
              Yeni şifre
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="h-11 bg-muted px-3"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password_confirm" className="text-muted-foreground">
              Şifre tekrar
            </Label>
            <Input
              id="password_confirm"
              name="password_confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="h-11 bg-muted px-3"
            />
          </div>
          <Button type="submit" size="lg" className="h-11 w-full text-base">
            Şifreyi kaydet
          </Button>
        </form>
      </div>
    </div>
  );
}
