import { unlockActorShareAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SharePinGate({
  token,
  error,
}: {
  token: string;
  error?: "pin" | "expired" | null;
}) {
  const message =
    error === "expired"
      ? "Bu linkin süresi dolmuş veya iptal edilmiş."
      : "Bu dosyayı açmak için paylaşılan 4 haneli şifreyi yaz.";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(107,44,145,0.14),transparent_55%)]" />
      <div className="relative w-full max-w-md rounded-3xl bg-card p-8 shadow-[0_24px_80px_rgba(107,44,145,0.08)] ring-1 ring-border sm:p-10">
        <img
          src="/brand-logo.png"
          alt="Rüzgar Oyunculuk"
          className="mb-4 h-20 w-20 rounded-2xl object-cover"
        />
        <p className="font-heading text-4xl tracking-tight text-foreground">Rüzgar Oyunculuk</p>
        <div className="mt-3 h-px w-16 bg-primary" />
        <h1 className="mt-5 text-xl font-semibold text-foreground">Paylaşılan dosya</h1>
        {error === "pin" ? (
          <p
            role="alert"
            className="mt-3 mb-8 rounded-xl bg-destructive/10 px-3 py-3 text-sm font-medium leading-6 text-destructive"
          >
            Şifre yanlış. 4 haneli sayıyı tekrar dene.
            <span className="mt-1 block font-normal text-destructive/80">
              Şifreyi sıfırlayamazsın; ajansın verdiği kodu kullan veya yeni link iste.
            </span>
          </p>
        ) : (
          <p className="mt-1 mb-8 text-sm leading-6 text-muted-foreground">{message}</p>
        )}
        {error === "expired" ? null : (
          <form action={unlockActorShareAction} className="grid gap-5">
            <input type="hidden" name="token" value={token} />
            <div className="grid gap-2">
              <Label htmlFor="pin" className="text-muted-foreground">
                4 haneli şifre
              </Label>
              <Input
                id="pin"
                name="pin"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                pattern="\d{4}"
                required
                placeholder="6060"
                aria-invalid={error === "pin"}
                className="h-12 text-center text-2xl tracking-[0.4em]"
              />
            </div>
            <Button type="submit" className="h-11">
              Dosyayı aç
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
