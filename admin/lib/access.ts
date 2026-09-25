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

export function hasCompletedForm(
  actor: Pick<ActorProfile, "registration_completed_at"> | null | undefined
) {
  return Boolean(actor?.registration_completed_at);
}

export function isFormSectionSaved(actor: ActorProfile | null | undefined) {
  return Boolean(actor?.form_saved_at || actor?.registration_completed_at);
}

export function isMediaSectionSaved(
  actor: ActorProfile | null | undefined,
  photoKinds: string[] = []
) {
  return (
    Boolean(actor?.media_saved_at || actor?.registration_completed_at) &&
    REQUIRED_PHOTO_KINDS.every((k) => photoKinds.includes(k)) &&
    Boolean(actor?.intro_video_playback_url) &&
    Boolean(actor?.mimic_video_playback_url)
  );
}

export function registrationStepCount(
  actor: ActorProfile | null | undefined,
  photoKinds: string[] = []
) {
  return (isFormSectionSaved(actor) ? 1 : 0) + (isMediaSectionSaved(actor, photoKinds) ? 1 : 0);
}

export function isAwaitingApproval(
  profile: Pick<Profile, "actor_status"> | null | undefined,
  actor: Pick<ActorProfile, "registration_completed_at"> | null | undefined
) {
  return profile?.actor_status === "pending" && hasCompletedForm(actor);
}
