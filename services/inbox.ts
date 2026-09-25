import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export type ActorInboxItem = {
  key: string;
  kind: 'option' | 'intro';
  sourceId: string;
  castId: string;
  projectName: string;
  roleName: string;
  createdAt: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeInbox(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitInboxChanged() {
  listeners.forEach((fn) => fn());
}

function seenStorageKey(userId: string) {
  return `actor-inbox-seen:${userId}`;
}

export async function getSeenInboxKeys(userId: string): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(seenStorageKey(userId));
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

export async function markInboxSeen(userId: string, keys: string[]) {
  const current = await getSeenInboxKeys(userId);
  for (const key of keys) current.add(key);
  await AsyncStorage.setItem(seenStorageKey(userId), JSON.stringify([...current]));
  emitInboxChanged();
}

export async function fetchActorInbox(actorId: string): Promise<ActorInboxItem[]> {
  const [{ data: optionRows, error: optionError }, { data: introRows, error: introError }] =
    await Promise.all([
      supabase
        .from('cast_options')
        .select('id, cast_id, created_at')
        .eq('actor_id', actorId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('cast_introductions')
        .select('id, cast_id, created_at')
        .eq('actor_id', actorId)
        .order('created_at', { ascending: false })
        .limit(40),
    ]);
  if (optionError) throw optionError;
  if (introError) throw introError;

  const castIds = [
    ...new Set([
      ...(optionRows ?? []).map((row) => row.cast_id as string),
      ...(introRows ?? []).map((row) => row.cast_id as string),
    ]),
  ];
  const titles = new Map<string, { project_name: string; role_name: string }>();
  if (castIds.length) {
    const { data: casts } = await supabase
      .from('cast_listings')
      .select('id, project_name, role_name')
      .in('id', castIds);
    for (const cast of casts ?? []) {
      titles.set(cast.id, {
        project_name: cast.project_name,
        role_name: cast.role_name,
      });
    }
  }

  const toItem = (
    kind: ActorInboxItem['kind'],
    row: { id: string; cast_id: string; created_at: string }
  ): ActorInboxItem => {
    const title = titles.get(row.cast_id);
    return {
      key: `${kind}:${row.id}`,
      kind,
      sourceId: row.id,
      castId: row.cast_id,
      projectName: title?.project_name ?? '',
      roleName: title?.role_name ?? '',
      createdAt: row.created_at,
    };
  };

  return [
    ...(optionRows ?? []).map((row) => toItem('option', row)),
    ...(introRows ?? []).map((row) => toItem('intro', row)),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function visibleInboxItems(items: ActorInboxItem[], seen: Set<string>) {
  return items.filter((item) => item.kind === 'option' || !seen.has(item.key));
}
