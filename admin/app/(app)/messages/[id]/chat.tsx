"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendMessageAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";
import { formatDateTime } from "@/lib/labels";

function mergeMessages(current: Message[], incoming: Message[]) {
  const map = new Map<string, Message>();
  for (const row of current) map.set(row.id, row);
  for (const row of incoming) map.set(row.id, row);
  return [...map.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

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
  const [items, setItems] = useState(messages);
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems((prev) => mergeMessages(prev, messages));
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const pull = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data?.length) setItems((prev) => mergeMessages(prev, data as Message[]));
    };

    const channel = supabase
      .channel(`admin-web-messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (msg?.id) setItems((prev) => mergeMessages(prev, [msg]));
        },
      )
      .subscribe();

    const poll = setInterval(() => {
      void pull();
    }, 4000);

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  return (
    <div className="flex h-[70vh] flex-col rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {items.map((m) => {
          const mine = m.sender_id === adminId;
          return (
            <div key={m.id} className={`max-w-[75%] space-y-1 ${mine ? "ml-auto" : ""}`}>
              <div
                className={`rounded-xl px-3 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {m.body}
              </div>
              <p className={`text-[11px] text-muted-foreground ${mine ? "text-right" : "text-left"}`}>
                {formatDateTime(m.created_at)}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const text = body.trim();
          if (!text) return;
          const temp: Message = {
            id: `temp-${Date.now()}`,
            conversation_id: conversationId,
            sender_id: adminId,
            body: text,
            read_at: null,
            created_at: new Date().toISOString(),
          };
          setBody("");
          setItems((prev) => mergeMessages(prev, [temp]));
          start(async () => {
            try {
              const created = await sendMessageAction(conversationId, text);
              if (created?.id) {
                setItems((prev) => mergeMessages(prev.filter((m) => m.id !== temp.id), [created as Message]));
              }
            } catch {
              setItems((prev) => prev.filter((m) => m.id !== temp.id));
              setBody(text);
            }
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
