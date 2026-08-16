import type { ActorProfile, Profile } from '@/types/database';
import {
  missingRequiredPhotos,
  type GalleryPhoto,
} from '@/services/gallery';

export function hasRequiredMedia(
  profile: Profile | null | undefined,
  actorProfile: ActorProfile | null | undefined,
  photos: GalleryPhoto[] = []
): boolean {
  return (
    Boolean(profile?.avatar_url) &&
    missingRequiredPhotos(photos).length === 0 &&
    Boolean(actorProfile?.intro_video_playback_url) &&
    Boolean(actorProfile?.mimic_video_playback_url)
  );
}

/** Cast / başvuru: form + zorunlu medya + admin onayı */
export function canAccessCasts(
  profile: Profile | null | undefined,
  actorProfile: ActorProfile | null | undefined,
  photos: GalleryPhoto[] = []
): boolean {
  return (
    profile?.role === 'actor' &&
    profile.actor_status === 'approved' &&
    Boolean(actorProfile?.registration_completed_at) &&
    hasRequiredMedia(profile, actorProfile, photos)
  );
}

export type ActorAccessState =
  | 'ready'
  | 'needs_form'
  | 'needs_media'
  | 'pending_approval'
  | 'rejected';

export function getActorAccessState(
  profile: Profile | null | undefined,
  actorProfile: ActorProfile | null | undefined,
  photos: GalleryPhoto[] = []
): ActorAccessState {
  if (profile?.actor_status === 'rejected') return 'rejected';
  if (!actorProfile?.registration_completed_at) return 'needs_form';
  if (!hasRequiredMedia(profile, actorProfile, photos)) return 'needs_media';
  if (profile?.actor_status !== 'approved') return 'pending_approval';
  return 'ready';
}
