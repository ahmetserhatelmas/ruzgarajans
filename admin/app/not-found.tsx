import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <p className="font-heading text-3xl">Sayfa bulunamadı</p>
      <Button asChild>
        <Link href="/">Panele dön</Link>
      </Button>
    </div>
  );
}
