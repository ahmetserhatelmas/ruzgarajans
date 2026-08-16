import {
  createStreamDirectUpload,
  streamPlaybackUrl,
  streamThumbnailUrl,
  uploadVideoToStream,
} from '@/lib/cloudflare';
import { supabase } from '@/lib/supabase';
import type { Video, VideoKind } from '@/types/database';

export async function recordAndUploadVideo(input: {
  localUri: string;
  userId: string;
  kind: VideoKind;
  castId?: string | null;
  applicationId?: string | null;
  title?: string;
  onProgress?: (percent: number) => void;
}): Promise<Video> {
  input.onProgress?.(0);

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

/** Clears intro video from actor profile (and marks related video rows failed). */
export async function clearIntroVideo(userId: string): Promise<void> {
  const { data: actor, error: readError } = await supabase
    .from('actor_profiles')
    .select('intro_video_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (readError) throw readError;

  const { error: clearError } = await supabase
    .from('actor_profiles')
    .update({
      intro_video_id: null,
      intro_video_playback_url: null,
    })
    .eq('user_id', userId);
  if (clearError) throw clearError;

  const cfUid = actor?.intro_video_id as string | null | undefined;
  if (cfUid) {
    await supabase
      .from('videos')
      .update({ status: 'failed' })
      .eq('user_id', userId)
      .eq('kind', 'intro')
      .eq('cf_uid', cfUid);
  } else {
    await supabase
      .from('videos')
      .update({ status: 'failed' })
      .eq('user_id', userId)
      .eq('kind', 'intro');
  }
}
