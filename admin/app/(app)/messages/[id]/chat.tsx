"use client";

import { useState, useTransition } from "react";
import { sendMessageAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Message } from "@/lib/types";

export function Chat({
  conversationId,
  adminId,
  messages,
}: {
  conversationId: string;
  adminId: string;
  messages: Message[];
}) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="flex h-[70vh] flex-col rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.sender_id === adminId;
          return (
            <div
              key={m.id}
              className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                mine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {m.body}
            </div>
          );
        })}
      </div>
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const text = body;
          setBody("");
          start(async () => {
            await sendMessageAction(conversationId, text);
          });
        }}
      >
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Mesaj yaz…"
          disabled={pending}
        />
        <Button type="submit" disabled={pending || !body.trim()}>
          Gönder
        </Button>
      </form>
    </div>
  );
}
