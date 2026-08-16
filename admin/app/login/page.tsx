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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 ring-1 ring-foreground/10">
        <p className="font-heading text-3xl">Rüzgâr Ajans</p>
        <h1 className="mt-1 text-lg font-medium">Admin girişi</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Mobil uygulamadaki admin hesabınla giriş yap.
        </p>
        {message ? (
          <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        ) : null}
        <form action={signInAction} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full">
            Giriş yap
          </Button>
        </form>
      </div>
    </div>
  );
}
