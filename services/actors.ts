import { supabase } from '@/lib/supabase';
import { uploadImageToStorage } from '@/lib/storageUpload';
import type { ActorProfile, ActorStatus, Profile } from '@/types/database';

export async function updateActorProfile(
  userId: string,
  patch: Partial<ActorProfile>
): Promise<void> {
  const { error } = await supabase
    .from('actor_profiles')
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function updateProfileBasics(
  userId: string,
  patch: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url' | 'cover_url' | 'actor_status'>>
): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

async function uploadProfileImageFile(input: {
  userId: string;
  localUri: string;
  mimeType?: string | null;
  role: 'avatar' | 'cover';
}): Promise<string> {
  // CF Images varyant/secret kurulumu olmadan güvenilir yol: Supabase Storage
  const bucket = input.role === 'avatar' ? 'avatars' : 'covers';
  const uploaded = await uploadImageToStorage({
    userId: input.userId,
    localUri: input.localUri,
    mimeType: input.mimeType,
    bucket,
    fileKey: `${input.role}-${Date.now()}`,
  });
  return uploaded.url;
}

export async function uploadProfileImage(input: {
  userId: string;
  localUri: string;
  mimeType?: string | null;
  role: 'avatar' | 'cover';
}): Promise<string> {
  const url = await uploadProfileImageFile(input);

  await updateProfileBasics(input.userId, {
    [input.role === 'avatar' ? 'avatar_url' : 'cover_url']: url,
  });

  return url;
}

export async function fetchActorsAdmin(status?: ActorStatus): Promise<Profile[]> {
  let q = supabase
    .from('profiles')
    .select('*')
    .eq('role', 'actor')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('actor_status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function setActorStatus(userId: string, status: ActorStatus) {
  const { error } = await supabase
    .from('profiles')
    .update({ actor_status: status })
    .eq('id', userId);
  if (error) throw error;
}

export async function fetchActorDetail(userId: string) {
  const [{ data: profile, error: e1 }, { data: actor, error: e2 }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('actor_profiles').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return {
    profile: profile as Profile | null,
    actor: actor as ActorProfile | null,
  };
}
