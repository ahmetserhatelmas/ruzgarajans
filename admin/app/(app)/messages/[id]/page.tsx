import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { fetchConversation, fetchMessages } from "@/lib/queries";
import { Chat } from "./chat";
import { DeleteConversationButton } from "@/components/delete-conversation-button";
import { requireAdminPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireAdminPerm("messages");
  if (!user) notFound();

  const [messages, convo] = await Promise.all([fetchMessages(id), fetchConversation(id)]);
  if (!convo) notFound();
  const name = convo.profiles?.full_name || convo.profiles?.email || "Oyuncu";

  return (
    <div>
      <PageHeader
        title={name}
        description={convo.profiles?.email ?? undefined}
        actions={<DeleteConversationButton conversationId={id} name={name} />}
      />
      <Chat conversationId={id} adminId={user.id} messages={messages} />
    </div>
  );
}
