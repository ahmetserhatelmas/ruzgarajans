"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteActorsAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteActorButton({
  actorId,
  name,
}: {
  actorId: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        Hesabı sil
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Hesabı sil</DialogTitle>
            <DialogDescription>
              {name} kalıcı olarak silinecek. Profil, fotoğraf ve başvurular da gider. Bu işlem
              geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                void (async () => {
                  setDeleting(true);
                  const result = await deleteActorsAction([actorId]);
                  setDeleting(false);
                  if (!result.ok) {
                    window.alert(result.error || "Silinemedi.");
                    return;
                  }
                  router.push("/actors");
                  router.refresh();
                })();
              }}
            >
              {deleting ? "Siliniyor…" : "Evet, sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
