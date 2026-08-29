import { signInAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message =
    error === "admin"
      ? "Bu panel yalnızca admin hesapları içindir."
      : error
        ? decodeURIComponent(error)
        : null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(107,44,145,0.14),transparent_55%)]" />
      <div className="relative w-full max-w-md rounded-3xl bg-card p-8 shadow-[0_24px_80px_rgba(107,44,145,0.08)] ring-1 ring-border sm:p-10">
        <img
          src="/brand-logo.png"
          alt="Rüzgar Oyunculuk"
          className="mb-4 h-20 w-20 rounded-2xl object-cover"
        />
        <p className="font-heading text-4xl tracking-tight text-foreground">
          Rüzgar Oyunculuk
        </p>
        <div className="mt-3 h-px w-16 bg-primary" />
        <h1 className="mt-5 text-xl font-semibold text-foreground">Admin girişi</h1>
        <p className="mt-1 mb-8 text-sm leading-6 text-muted-foreground">
          Mobil uygulamadaki admin hesabınla giriş yap.
        </p>
        {message ? (
          <p className="mb-5 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        ) : null}
        <form action={signInAction} className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-muted-foreground">
              E-posta
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-11 bg-muted px-3"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-muted-foreground">
              Şifre
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="h-11 bg-muted px-3"
            />
          </div>
          <Button type="submit" size="lg" className="h-11 w-full text-base">
            Giriş yap
          </Button>
        </form>
      </div>
    </div>
  );
}
