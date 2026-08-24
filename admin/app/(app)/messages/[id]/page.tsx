import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { fetchConversations, fetchMessages } from "@/lib/queries";
import { Chat } from "./chat";
import { requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminPerm("messages");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [messages, conversations] = await Promise.all([
    fetchMessages(id),
    fetchConversations(),
  ]);
  const convo = conversations.find((c) => c.id === id);
  if (!convo) notFound();

  return (
    <div>
      <PageHeader
        title={convo.profiles?.full_name || "Mesaj"}
        description={convo.profiles?.email ?? undefined}
      />
      <Chat conversationId={id} adminId={user.id} messages={messages} />
    </div>
  );
}
