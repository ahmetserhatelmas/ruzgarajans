import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DeleteConversationButton } from "@/components/delete-conversation-button";
import { TableSkeleton } from "@/components/page-skeleton";
import { fetchConversations } from "@/lib/queries";
import { formatDate } from "@/lib/labels";
import { requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default function MessagesPage() {
  return (
    <div>
      <PageHeader title="Mesajlar" description="Oyuncularla ajans yazışmaları." />
      <Suspense fallback={<TableSkeleton />}>
        <MessagesBody />
      </Suspense>
    </div>
  );
}

async function MessagesBody() {
  await requireAdminPerm("messages");
  const items = await fetchConversations();
  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz konuşma yok.</p>
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
  );
}
