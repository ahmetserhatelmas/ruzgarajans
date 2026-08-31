import type { ActorProfile, Profile } from '@/types/database';
import {
  missingRequiredPhotos,
  type GalleryPhoto,
} from '@/services/gallery';

export function isFormSectionSaved(actor: ActorProfile | null | undefined) {
  return Boolean(actor?.form_saved_at || actor?.registration_completed_at);
}

export function hasRequiredGalleryMedia(
  actorProfile: ActorProfile | null | undefined,
  photos: GalleryPhoto[] = []
) {
  return (
    missingRequiredPhotos(photos).length === 0 &&
    Boolean(actorProfile?.intro_video_playback_url) &&
    Boolean(actorProfile?.mimic_video_playback_url)
  );
}

export function isMediaSectionSaved(
  _profile: Profile | null | undefined,
  actor: ActorProfile | null | undefined,
  photos: GalleryPhoto[] = []
) {
  return Boolean(actor?.media_saved_at) && hasRequiredGalleryMedia(actor, photos);
}

export function registrationStepCount(
  profile: Profile | null | undefined,
  actor: ActorProfile | null | undefined,
  photos: GalleryPhoto[] = []
) {
  return (isFormSectionSaved(actor) ? 1 : 0) + (isMediaSectionSaved(profile, actor, photos) ? 1 : 0);
}

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
  _photos: GalleryPhoto[] = []
): boolean {
  return (
    profile?.role === 'actor' &&
    profile.actor_status === 'approved' &&
    Boolean(actorProfile?.registration_completed_at)
  );
}

/** Ajans mesajları: yalnızca admin onaylı oyuncular */
export function canSendAgencyMessages(profile: Profile | null | undefined): boolean {
  return profile?.role === 'actor' && profile.actor_status === 'approved';
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
  if (profile?.actor_status === 'approved' && actorProfile?.registration_completed_at) {
    return 'ready';
  }
  if (!actorProfile?.registration_completed_at) return 'needs_form';
  if (!hasRequiredMedia(profile, actorProfile, photos)) return 'needs_media';
  if (profile?.actor_status !== 'approved') return 'pending_approval';
  return 'ready';
}
