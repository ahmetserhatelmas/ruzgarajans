import { supabase } from '@/lib/supabase';
import type { Conversation, Message } from '@/types/database';

export async function getOrCreateConversation(actorId: string): Promise<Conversation> {
  const { data: existing, error: e1 } = await supabase
    .from('conversations')
    .select('*')
    .eq('actor_id', actorId)
    .maybeSingle();
  if (e1) throw e1;
  if (existing) return existing as Conversation;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ actor_id: actorId })
    .select('*')
    .single();
  if (error) throw error;
  return data as Conversation;
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  body: string;
}): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      body: input.body.trim(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Message;
}

export async function fetchConversationsAdmin(): Promise<
  (Conversation & { profiles?: { full_name: string | null; email: string | null } })[]
> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, profiles:actor_id(full_name, email)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}
