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

export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const map = new Map<string, Message>();
  for (const row of [...current, ...incoming]) map.set(row.id, row);
  const rows = [...map.values()];
  const confirmed = new Set(
    rows.filter((m) => !m.id.startsWith('temp-')).map((m) => `${m.sender_id}:${m.body}`)
  );
  return rows
    .filter((m) => !m.id.startsWith('temp-') || !confirmed.has(`${m.sender_id}:${m.body}`))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
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
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, actor_status')
    .eq('id', input.senderId)
    .maybeSingle();
  if (profileError) throw profileError;
  const allowed =
    profile?.role === 'admin' ||
    (profile?.role === 'actor' && profile.actor_status === 'approved');
  if (!allowed) {
    throw new Error('Only approved actors can send messages');
  }

  const payload = {
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    body: input.body.trim(),
  };
  const { data, error } = await supabase.from('messages').insert(payload).select('*').single();
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.conversationId);
  if (!error && data) return data as Message;

  const latest = await fetchMessages(input.conversationId);
  const found = [...latest]
    .reverse()
    .find((m) => m.sender_id === payload.sender_id && m.body === payload.body);
  if (found) return found;
  if (error) throw error;
  return {
    id: `temp-${Date.now()}`,
    read_at: null,
    created_at: new Date().toISOString(),
    ...payload,
  };
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
