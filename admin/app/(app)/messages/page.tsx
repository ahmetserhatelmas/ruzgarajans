import Link from "next/link";
import { PageHeader } from "@/components/page-header";
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
          items.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="block rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 hover:bg-muted/40"
            >
              <p className="font-medium">
                {c.profiles?.full_name || c.profiles?.email || "Oyuncu"}
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(c.updated_at)}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
