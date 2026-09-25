"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteConversationAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteConversationButton({
  conversationId,
  name,
  compact,
}: {
  conversationId: string;
  name: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size={compact ? "sm" : "default"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        Sil
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Yazışmayı sil</DialogTitle>
            <DialogDescription>
              {name} ile olan tüm mesajlar kalıcı olarak silinecek. Oyuncunun uygulamasından da
              kalkar. Bu işlem geri alınamaz.
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
                  const result = await deleteConversationAction(conversationId);
                  setDeleting(false);
                  if (!result.ok) {
                    window.alert(result.error);
                    return;
                  }
                  setOpen(false);
                  router.push("/messages");
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
