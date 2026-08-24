import { supabase } from '@/lib/supabase';
import type { ActorProfile, ActorShare, Profile, Video } from '@/types/database';
import { fetchGalleryPhotos, type GalleryPhoto } from '@/services/gallery';

export type DirectorShareRow = ActorShare & {
  actor: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
};

export async function fetchMyActorShares(): Promise<DirectorShareRow[]> {
  const { data, error } = await supabase
    .from('actor_shares')
    .select('*, actor:actor_id(id, full_name, avatar_url)')
    .is('revoked_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DirectorShareRow[];
}

export async function fetchSharedActorDetail(actorId: string): Promise<{
  profile: Profile | null;
  actor: ActorProfile | null;
  photos: GalleryPhoto[];
  videos: Video[];
}> {
  const [{ data: profile }, { data: actor }, photos, { data: videos }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', actorId).maybeSingle(),
    supabase.from('actor_profiles').select('*').eq('user_id', actorId).maybeSingle(),
    fetchGalleryPhotos(actorId).catch(() => [] as GalleryPhoto[]),
    supabase
      .from('videos')
      .select('*')
      .eq('user_id', actorId)
      .not('playback_url', 'is', null),
  ]);
  return {
    profile: (profile as Profile) ?? null,
    actor: (actor as ActorProfile) ?? null,
    photos,
    videos: (videos ?? []) as Video[],
  };
}
