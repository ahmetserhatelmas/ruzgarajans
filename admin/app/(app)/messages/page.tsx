import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DeleteConversationButton } from "@/components/delete-conversation-button";
import { NewMessagePicker } from "@/components/new-message";
import { TableSkeleton } from "@/components/page-skeleton";
import { fetchConversations, fetchMessageContacts } from "@/lib/queries";
import { formatDate } from "@/lib/labels";
import { requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default function MessagesPage() {
  return (
    <div>
      <Suspense fallback={<TableSkeleton />}>
        <MessagesBody />
      </Suspense>
    </div>
  );
}

async function MessagesBody() {
  await requireAdminPerm("messages");
  const [items, contacts] = await Promise.all([fetchConversations(), fetchMessageContacts()]);
  const existingByActor = Object.fromEntries(items.map((row) => [row.actor_id, row.id]));

  return (
    <>
      <PageHeader
        title="Mesajlar"
        description="Oyuncu seç, mesaj yaz."
        actions={<NewMessagePicker contacts={contacts} existingByActor={existingByActor} />}
      />
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Henüz konuşma yok. Yeni mesaj ile bir oyuncu seçebilirsin.
          </p>
        ) : (
          items.map((c) => {
            const name = c.profiles?.full_name || c.profiles?.email || "Oyuncu";
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10"
              >
                <Link href={`/messages/${c.id}`} prefetch={false} className="min-w-0 flex-1 hover:opacity-80">
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.updated_at)}</p>
                </Link>
                <DeleteConversationButton conversationId={c.id} name={name} compact />
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
