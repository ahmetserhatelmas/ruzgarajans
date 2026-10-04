"use client";

import { useMemo, useState } from "react";
import { startConversationAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MessageContact } from "@/lib/queries";

export function NewMessagePicker({
  contacts,
  existingByActor,
}: {
  contacts: MessageContact[];
  existingByActor: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    const list = needle
      ? contacts.filter((row) => {
          const hay = `${row.full_name ?? ""} ${row.email ?? ""}`.toLocaleLowerCase("tr-TR");
          return hay.includes(needle);
        })
      : contacts;
    return list.slice(0, 60);
  }, [contacts, query]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Yeni mesaj
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery("");
            setPendingId(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[80vh] flex-col gap-3 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mesaj yaz</DialogTitle>
            <DialogDescription>Oyuncuyu seç, konuşma açılsın.</DialogDescription>
          </DialogHeader>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ad veya e-posta ara…"
            autoFocus
          />
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="px-1 py-6 text-sm text-muted-foreground">
                {contacts.length === 0 ? "Kayıtlı oyuncu yok." : "Eşleşen oyuncu yok."}
              </p>
            ) : (
              matches.map((row) => {
                const name = row.full_name || row.email || "Oyuncu";
                const existingId = existingByActor[row.id];
                return (
                  <form
                    key={row.id}
                    action={startConversationAction.bind(null, row.id)}
                    onSubmit={() => setPendingId(row.id)}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{name}</p>
                      {row.email && row.full_name ? (
                        <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                      ) : null}
                    </div>
                    <Button type="submit" size="sm" variant="outline" disabled={pendingId === row.id}>
                      {pendingId === row.id
                        ? "Açılıyor…"
                        : existingId
                          ? "Yazışmaya git"
                          : "Mesaj yaz"}
                    </Button>
                  </form>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
