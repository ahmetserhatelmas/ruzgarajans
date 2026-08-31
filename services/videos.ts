import {
  createStreamDirectUpload,
  streamPlaybackUrl,
  streamThumbnailUrl,
  uploadVideoToStream,
} from '@/lib/cloudflare';
import { supabase } from '@/lib/supabase';
import { LANG_INTRO_KIND, LANG_INTRO_MAX } from '@/lib/langIntro';
import type { Video, VideoKind } from '@/types/database';

export async function fetchLangIntroVideos(userId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .eq('kind', LANG_INTRO_KIND)
    .eq('status', 'ready')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Video[]).slice(0, LANG_INTRO_MAX);
}

export async function recordAndUploadVideo(input: {
  localUri: string;
  userId: string;
  kind: VideoKind;
  castId?: string | null;
  applicationId?: string | null;
  title?: string;
  replaceVideoId?: string;
  onProgress?: (percent: number) => void;
}): Promise<Video> {
  input.onProgress?.(0);

  if (input.kind === LANG_INTRO_KIND) {
    const existing = await fetchLangIntroVideos(input.userId);
    const replacing = input.replaceVideoId
      ? existing.some((row) => row.id === input.replaceVideoId)
      : false;
    if (!replacing && existing.length >= LANG_INTRO_MAX) {
      throw new Error('En fazla 2 yabancı dil videosu ekleyebilirsin.');
    }
  }

  const { uploadURL, uid } = await createStreamDirectUpload({
    kind: input.kind,
    userId: input.userId,
  });

  const { data: row, error: insertError } = await supabase
    .from('videos')
    .insert({
      user_id: input.userId,
      cast_id: input.castId ?? null,
      application_id: input.applicationId ?? null,
      kind: input.kind,
      cf_uid: uid,
      status: 'uploading',
      title: input.title ?? null,
    })
    .select('*')
    .single();

  if (insertError) throw insertError;

  try {
    await uploadVideoToStream(input.localUri, uploadURL, ({ percent }) => {
      input.onProgress?.(percent);
    });
  } catch (e) {
    await supabase.from('videos').update({ status: 'failed' }).eq('id', row.id);
    throw e;
  }

  const playback = streamPlaybackUrl(uid);
  const thumb = streamThumbnailUrl(uid);

  const { data: updated, error: updateError } = await supabase
    .from('videos')
    .update({
      status: 'ready',
      playback_url: playback,
      thumbnail_url: thumb,
    })
    .eq('id', row.id)
    .select('*')
    .single();

  if (updateError) throw updateError;

  if (input.kind === 'intro') {
    await supabase
      .from('actor_profiles')
      .update({
        intro_video_id: uid,
        intro_video_playback_url: playback,
      })
      .eq('user_id', input.userId);
  }

  if (input.kind === 'showreel') {
    await supabase
      .from('actor_profiles')
      .update({
        showreel_video_id: uid,
        showreel_playback_url: playback,
      })
      .eq('user_id', input.userId);
  }

  if (input.kind === 'mimic') {
    await supabase
      .from('actor_profiles')
      .update({
        mimic_video_id: uid,
        mimic_video_playback_url: playback,
      })
      .eq('user_id', input.userId);
  }

  if (input.kind === 'talent') {
    await supabase
      .from('actor_profiles')
      .update({
        talent_video_id: uid,
        talent_video_playback_url: playback,
      })
      .eq('user_id', input.userId);
  }

  if (input.kind === LANG_INTRO_KIND && input.replaceVideoId) {
    await supabase
      .from('videos')
      .update({ status: 'failed' })
      .eq('id', input.replaceVideoId)
      .eq('user_id', input.userId)
      .eq('kind', LANG_INTRO_KIND);
  }

  return updated as Video;
}

export async function fetchVideosForCast(castId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('cast_id', castId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Video[];
}

/** Audition videos for admin applications list (ready only). */
export async function fetchAuditionVideosAdmin(): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('kind', 'audition')
    .eq('status', 'ready')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Video[];
}

const PROFILE_VIDEO_FIELDS = {
  intro: { id: 'intro_video_id', url: 'intro_video_playback_url' },
  mimic: { id: 'mimic_video_id', url: 'mimic_video_playback_url' },
  showreel: { id: 'showreel_video_id', url: 'showreel_playback_url' },
  talent: { id: 'talent_video_id', url: 'talent_video_playback_url' },
} as const;

export type ProfileVideoKind = keyof typeof PROFILE_VIDEO_FIELDS;

/** Clears a profile video (intro / mimic / showreel / talent). */
export async function clearProfileVideo(userId: string, kind: ProfileVideoKind): Promise<void> {
  const fields = PROFILE_VIDEO_FIELDS[kind];
  const { data: actor, error: readError } = await supabase
    .from('actor_profiles')
    .select(fields.id)
    .eq('user_id', userId)
    .maybeSingle();
  if (readError) throw readError;

  const { error: clearError } = await supabase
    .from('actor_profiles')
    .update({
      [fields.id]: null,
      [fields.url]: null,
    })
    .eq('user_id', userId);
  if (clearError) throw clearError;

  const row = actor as Record<string, string | null> | null;
  const cfUid = row?.[fields.id];
  if (cfUid) {
    await supabase.from('videos').delete().eq('user_id', userId).eq('kind', kind).eq('cf_uid', cfUid);
  } else {
    await supabase.from('videos').delete().eq('user_id', userId).eq('kind', kind);
  }
}

export async function clearIntroVideo(userId: string): Promise<void> {
  await clearProfileVideo(userId, 'intro');
}

export async function deleteOwnVideo(userId: string, videoId: string): Promise<void> {
  const { error } = await supabase.from('videos').delete().eq('id', videoId).eq('user_id', userId);
  if (error) throw error;
}
