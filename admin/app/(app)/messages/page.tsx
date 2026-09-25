import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DeleteConversationButton } from "@/components/delete-conversation-button";
import { fetchConversations } from "@/lib/queries";
import { formatDate } from "@/lib/labels";
import { requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  await requireAdminPerm("messages");
  const items = await fetchConversations();
  return (
    <div>
      <PageHeader title="Mesajlar" description="Oyuncularla ajans yazışmaları." />
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
                <Link href={`/messages/${c.id}`} className="min-w-0 flex-1 hover:opacity-80">
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.updated_at)}</p>
                </Link>
                <DeleteConversationButton conversationId={c.id} name={name} compact />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
