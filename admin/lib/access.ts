import { REQUIRED_PHOTO_KINDS, type ActorProfile, type Profile } from "./types";

export function hasRequiredMedia(
  profile: Profile | null | undefined,
  actor: ActorProfile | null | undefined,
  photoKinds: string[] = []
) {
  return (
    Boolean(profile?.avatar_url) &&
    REQUIRED_PHOTO_KINDS.every((k) => photoKinds.includes(k)) &&
    Boolean(actor?.intro_video_playback_url) &&
    Boolean(actor?.mimic_video_playback_url)
  );
}

export function hasCompletedForm(actor: ActorProfile | null | undefined) {
  return Boolean(actor?.registration_completed_at);
}
