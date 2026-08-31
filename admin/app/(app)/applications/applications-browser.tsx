"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createApplicationShareAction, deleteApplicationsAction } from "@/lib/actions";
import { ShareApplicationPacks } from "@/components/share-application-packs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppStatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/labels";
import type { Application, ApplicationShare, CastListing, Profile } from "@/lib/types";

type ApplicationRow = Application & {
  profiles: Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "actor_status"> | null;
  cast_listings: Pick<
    CastListing,
    "id" | "project_name" | "role_name" | "deadline" | "budget_amount" | "budget_currency"
  > | null;
};

export function ApplicationsBrowser({
  apps,
  shares,
  shareUrls,
  shareNames,
  sharedToken,
  shareError,
  canExport,
}: {
  apps: ApplicationRow[];
  shares: ApplicationShare[];
  shareUrls: Record<string, string>;
  shareNames: Record<string, string>;
  sharedToken?: string;
  shareError?: string;
  canExport?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pin, setPin] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleAll = () => {
    setSelected((current) => (current.length === apps.length ? [] : apps.map((app) => app.id)));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {apps.length} başvuru
        {selected.length ? ` · ${selected.length} seçili` : ""}
      </p>

      {shareError === "pin" ? (
        <p className="text-sm text-destructive">Paket için 4 haneli şifre yaz.</p>
      ) : null}
      {shareError === "pick" ? (
        <p className="text-sm text-destructive">En az bir başvuru seç.</p>
      ) : null}

      <ShareApplicationPacks
        shares={shares}
        urls={shareUrls}
        names={shareNames}
        highlightToken={sharedToken}
      />

      <form
        action={createApplicationShareAction}
        className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      >
        {selected.map((id) => (
          <input key={id} type="hidden" name="application_ids" value={id} />
        ))}
        <p className="text-sm text-muted-foreground">
          Bir veya birkaç başvuru seç, 4 haneli şifre koy. Aynı linkte hepsi açılır.
        </p>
        <div className="grid gap-4 sm:grid-cols-[12rem_11rem_auto] sm:items-end">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">4 haneli şifre</span>
            <input
              name="pin"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              pattern="\d{4}"
              required
              placeholder="6060"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-10 w-full rounded-md border border-input bg-background px-4 text-center text-lg tracking-[0.3em] [text-indent:0.3em]"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Süre</span>
            <select
              name="ttl"
              defaultValue="1d"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="1d">1 gün</option>
              <option value="7d">7 gün</option>
              <option value="forever">Süresiz</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={selected.length === 0}>
              {selected.length ? `${selected.length} başvuruyu paylaş` : "Seçip paylaş"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={selected.length === 0 || deleting}
              onClick={() => setConfirmDelete(true)}
            >
              {selected.length ? `${selected.length} başvuruyu sil` : "Silmek için seç"}
            </Button>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={apps.length > 0 && selected.length === apps.length}
                  onChange={toggleAll}
                  aria-label="Tümünü seç"
                />
              </TableHead>
              <TableHead>Oyuncu</TableHead>
              <TableHead>İlan</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Bütçe</TableHead>
              <TableHead>Tarih</TableHead>
              {canExport ? <TableHead className="text-right">Dosya</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.includes(a.id)}
                    onChange={() => toggle(a.id)}
                    aria-label="Seç"
                  />
                </TableCell>
                <TableCell>
                  <Link href={`/applications/${a.id}`} className="font-medium hover:underline">
                    {a.profiles?.full_name || a.profiles?.email}
                  </Link>
                </TableCell>
                <TableCell>
                  {a.cast_listings?.project_name} · {a.cast_listings?.role_name}
                </TableCell>
                <TableCell>
                  <AppStatusBadge status={a.status} />
                </TableCell>
                <TableCell>{a.accept_budget ? "Kabul" : formatMoney(a.counter_budget)}</TableCell>
                <TableCell>{formatDate(a.created_at)}</TableCell>
                {canExport ? (
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/applications/${a.id}/export`}>İndir</a>
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Başvuruları sil</DialogTitle>
            <DialogDescription>
              {selected.length} başvuruyu silmek istiyorsunuz. Emin misiniz? Bu işlem geri
              alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setConfirmDelete(false)}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || selected.length === 0}
              onClick={() => {
                void (async () => {
                  setDeleting(true);
                  const result = await deleteApplicationsAction(selected);
                  setDeleting(false);
                  if (!result.ok) {
                    window.alert(result.error || "Silinemedi.");
                    return;
                  }
                  setSelected([]);
                  setConfirmDelete(false);
                  router.refresh();
                })();
              }}
            >
              {deleting ? "Siliniyor…" : "Evet, sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
